// TODO:
//  - Add a way to cancel/terminate a +watch

//! BRP transport using JSON-RPC over WebSocket.
//!
//! Adding the [`RemoteWebSocketPlugin`] to your [`App`] causes Bevy to accept
//! connections over WebSocket (by default, on port 15703) while your app is running.

#![cfg(not(target_family = "wasm"))]

use anyhow::Result as AnyhowResult;
use async_channel::{Receiver, Sender};
use async_io::Async;
use bevy::app::{App, Plugin, Startup};
use bevy::ecs::system::{Res, Resource};
use bevy::remote::{
    error_codes, BrpBatch, BrpError, BrpMessage, BrpRequest, BrpResponse, BrpResult, BrpSender,
};
use bevy::tasks::IoTaskPool;
use core::{
    net::{IpAddr, Ipv4Addr},
    pin::Pin,
};
use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use http_body_util::Full;
use hyper::{
    body::{Bytes, Incoming},
    server::conn::http1,
    service, Method, Request, Response,
};
use hyper_tungstenite::{HyperWebsocket, HyperWebsocketStream};
use serde_json::Value;
use smol_hyper::rt::{FuturesIo, SmolTimer};
use std::net::{TcpListener, TcpStream};
use tungstenite::Message;

/// The default port that Bevy will listen on.
pub const DEFAULT_PORT: u16 = 15703;

/// The default host address that Bevy will use for its server.
pub const DEFAULT_ADDR: IpAddr = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));

/// Add this plugin to your [`App`] to allow remote connections over WebSocket to inspect and modify entities.
/// It requires the [`bevy_remote::RemotePlugin`].
///
/// This BRP transport cannot be used when targeting WASM.
///
/// The defaults are:
/// - [`DEFAULT_ADDR`] : 127.0.0.1.
/// - [`DEFAULT_PORT`] : 15702.
///
pub struct RemoteWebSocketPlugin {
    /// The address that Bevy will bind to.
    address: IpAddr,
    /// The port that Bevy will listen on.
    port: u16,
}

impl Default for RemoteWebSocketPlugin {
    fn default() -> Self {
        Self {
            address: DEFAULT_ADDR,
            port: DEFAULT_PORT,
        }
    }
}

impl Plugin for RemoteWebSocketPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(HostAddress(self.address))
            .insert_resource(HostPort(self.port))
            .add_systems(Startup, start_websocket_server);
    }
}

impl RemoteWebSocketPlugin {
    /// Set the IP address that the server will use.
    #[must_use]
    pub fn with_address(mut self, address: impl Into<IpAddr>) -> Self {
        self.address = address.into();
        self
    }
    /// Set the remote port that the server will listen on.
    #[must_use]
    pub fn with_port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }
}

/// A resource containing the IP address that Bevy will host on.
///
/// Currently, changing this while the application is running has no effect; this merely
/// reflects the IP address that is set during the setup of the [`RemoteWebSocketPlugin`].
#[derive(Debug, Resource)]
pub struct HostAddress(pub IpAddr);

/// A resource containing the port number that Bevy will listen on.
///
/// Currently, changing this while the application is running has no effect; this merely
/// reflects the host that is set during the setup of the [`RemoteWebSocketPlugin`].
#[derive(Debug, Resource)]
pub struct HostPort(pub u16);

/// A system that starts up the Bevy Remote Protocol WebSocket server.
fn start_websocket_server(
    request_sender: Res<BrpSender>,
    address: Res<HostAddress>,
    remote_port: Res<HostPort>,
) {
    IoTaskPool::get()
        .spawn(server_main(
            address.0,
            remote_port.0,
            request_sender.clone(),
        ))
        .detach();
}

/// The Bevy Remote Protocol WebSocket server main loop.
async fn server_main(
    address: IpAddr,
    port: u16,
    request_sender: Sender<BrpMessage>,
) -> AnyhowResult<()> {
    listen(
        Async::<TcpListener>::bind((address, port))?,
        &request_sender,
    )
    .await
}

async fn listen(
    listener: Async<TcpListener>,
    request_sender: &Sender<BrpMessage>,
) -> AnyhowResult<()> {
    loop {
        let (client, _) = listener.accept().await?;

        let request_sender = request_sender.clone();
        IoTaskPool::get()
            .spawn(async move {
                let _ = handle_client(client, request_sender).await;
            })
            .detach();
    }
}

async fn handle_client(
    client: Async<TcpStream>,
    request_sender: Sender<BrpMessage>,
) -> AnyhowResult<()> {
    http1::Builder::new()
        .timer(SmolTimer::new())
        .serve_connection(
            FuturesIo::new(client),
            service::service_fn(|request| process_http_request(request, &request_sender)),
        )
        .with_upgrades()
        .await?;

    Ok(())
}

async fn process_http_request(
    mut request: Request<Incoming>,
    request_sender: &Sender<BrpMessage>,
) -> anyhow::Result<Response<Full<Bytes>>> {
    if hyper_tungstenite::is_upgrade_request(&request) {
        // Handle WebSocket upgrade
        let (response, websocket) = hyper_tungstenite::upgrade(&mut request, None)?;

        IoTaskPool::get()
            .spawn(process_websocket_connection(
                websocket,
                request_sender.clone(),
            ))
            .detach();

        Ok(response)
    } else if request.method() == Method::OPTIONS {
        // Handle OPTIONS request
        let response = Response::builder()
            .status(200)
            .body(Full::new(Bytes::new()))?;

        Ok(response)
    } else {
        // Handle invalid request
        let response_body = serde_json::to_string(&BrpError {
            code: error_codes::INVALID_REQUEST,
            message: "Invalid request. This endpoint only accepts WebSocket connections.".into(),
            data: None,
        })?;

        let response = Response::builder()
            .status(400)
            .body(Full::new(response_body.into_bytes().into()))
            .unwrap();

        Ok(response)
    }
}

async fn process_websocket_connection(
    ws: HyperWebsocket,
    request_sender: Sender<BrpMessage>,
) -> anyhow::Result<()> {
    let ws = ws.await?;

    let (write_stream, mut read_stream) = ws.split();

    let (response_sender, response_receiver) = async_channel::bounded(32);

    // Send any queued outgoing responses in a background task
    IoTaskPool::get()
        .spawn(relay_responses(Box::pin(response_receiver), write_stream))
        .detach();

    // Read and process incoming requests
    while let Some(message) = read_stream.next().await {
        match message {
            Ok(Message::Text(request)) => {
                IoTaskPool::get()
                    .spawn(process_request_or_batch(
                        request,
                        request_sender.clone(),
                        response_sender.clone(),
                    ))
                    .detach();
            }
            Ok(Message::Close(_)) | Err(_) => return Ok(()),
            _ => {}
        }
    }

    Ok(())
}

async fn relay_responses(
    mut response_receiver: Pin<Box<Receiver<Message>>>,
    mut write_stream: SplitSink<HyperWebsocketStream, Message>,
) -> AnyhowResult<()> {
    while let Some(response) = response_receiver.next().await {
        write_stream.send(response).await?;
    }
    Ok(())
}

async fn process_request_or_batch(
    request: String,
    request_sender: Sender<BrpMessage>,
    response_sender: Sender<Message>,
) -> AnyhowResult<()> {
    let batch = serde_json::from_str::<BrpBatch>(&request);

    let result = match batch {
        Ok(BrpBatch::Single(request)) => {
            let response = process_single_request(request, &request_sender).await?;
            match response {
                BrpWebSocketResponse::Complete(res) => {
                    BrpWebSocketResponse::Complete(serde_json::to_string(&res)?)
                }
                BrpWebSocketResponse::Stream(stream) => BrpWebSocketResponse::Stream(stream),
            }
        }
        Ok(BrpBatch::Batch(requests)) => {
            let mut responses = Vec::new();

            for request in requests {
                let response = process_single_request(request, &request_sender).await?;
                match response {
                    BrpWebSocketResponse::Complete(res) => responses.push(res),
                    BrpWebSocketResponse::Stream(BrpStream { id, .. }) => {
                        responses.push(BrpResponse::new(
                            id,
                            Err(BrpError {
                                code: error_codes::INVALID_REQUEST,
                                message: "Streaming can not be used in batch requests".to_string(),
                                data: None,
                            }),
                        ));
                    }
                }
            }

            BrpWebSocketResponse::Complete(serde_json::to_string(&responses)?)
        }
        Err(err) => {
            let err = BrpResponse::new(
                None,
                Err(BrpError {
                    code: error_codes::INVALID_REQUEST,
                    message: err.to_string(),
                    data: None,
                }),
            );

            BrpWebSocketResponse::Complete(serde_json::to_string(&err)?)
        }
    };

    match result {
        BrpWebSocketResponse::Complete(serialized) => {
            response_sender.send(Message::text(serialized)).await?;
        }
        BrpWebSocketResponse::Stream(mut stream) => {
            while let Some(result) = stream.rx.next().await {
                let response = BrpResponse::new(stream.id.clone(), result);
                let serialized = serde_json::to_string(&response).unwrap();
                response_sender.send(Message::text(serialized)).await?;
            }
        }
    };

    Ok(())
}

async fn process_single_request(
    request: Value,
    request_sender: &Sender<BrpMessage>,
) -> AnyhowResult<BrpWebSocketResponse<BrpResponse, BrpStream>> {
    // Reach in and get the request ID early so that we can report it even when parsing fails.
    let id = request.as_object().and_then(|map| map.get("id")).cloned();

    let request: BrpRequest = match serde_json::from_value(request) {
        Ok(v) => v,
        Err(err) => {
            return Ok(BrpWebSocketResponse::Complete(BrpResponse::new(
                id,
                Err(BrpError {
                    code: error_codes::INVALID_REQUEST,
                    message: err.to_string(),
                    data: None,
                }),
            )));
        }
    };

    if request.jsonrpc != "2.0" {
        return Ok(BrpWebSocketResponse::Complete(BrpResponse::new(
            id,
            Err(BrpError {
                code: error_codes::INVALID_REQUEST,
                message: String::from("JSON-RPC request requires `\"jsonrpc\": \"2.0\"`"),
                data: None,
            }),
        )));
    }

    let watch = request.method.contains("+watch");
    let size = if watch { 8 } else { 1 };
    let (result_sender, result_receiver) = async_channel::bounded(size);

    let _ = request_sender
        .send(BrpMessage {
            method: request.method,
            params: request.params,
            sender: result_sender,
        })
        .await;

    if watch {
        Ok(BrpWebSocketResponse::Stream(BrpStream {
            id: request.id,
            rx: Box::pin(result_receiver),
        }))
    } else {
        let result = result_receiver.recv().await?;
        Ok(BrpWebSocketResponse::Complete(BrpResponse::new(
            request.id, result,
        )))
    }
}

struct BrpStream {
    id: Option<Value>,
    rx: Pin<Box<Receiver<BrpResult>>>,
}

enum BrpWebSocketResponse<C, S> {
    Complete(C),
    Stream(S),
}
