use std::net::{IpAddr, Ipv4Addr, TcpListener, TcpStream};

use bevy::{
    prelude::*,
    remote::{error_codes, BrpError, BrpMessage, BrpRequest, BrpResponse, BrpResult},
    tasks::IoTaskPool,
};
use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use http_body_util::Full;
use hyper::{
    body::{Bytes, Incoming},
    header::{
        HeaderValue, ACCESS_CONTROL_ALLOW_METHODS, ACCESS_CONTROL_ALLOW_ORIGIN,
        ACCESS_CONTROL_MAX_AGE, ORIGIN,
    },
    server::conn::http1,
    service, Method, Request, Response,
};
use hyper_tungstenite::{HyperWebsocket, HyperWebsocketStream};
use serde_json::Value;
use smol::{
    channel::{self, Receiver, Sender},
    Async,
};
use smol_hyper::rt::{FuturesIo, SmolTimer};
use tungstenite::Message;

use crate::{StreamClientId, StreamMessage, StreamMessageKind, StreamSender};

/// The default port that the WebSocket server will listen on.
pub const DEFAULT_PORT: u16 = 3000;

/// The default host address that WebSocket server will use.
pub const DEFAULT_ADDR: IpAddr = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
/// Add this plugin to your [`App`] to allow remote connections to inspect and modify entities.
///
/// The defaults are:
/// - [`DEFAULT_ADDR`] : 127.0.0.1.
/// - [`DEFAULT_PORT`] : 3000.
///
pub struct RemoteStreamWebSocketPlugin {
    /// The address that the WebSocket server will use.
    address: IpAddr,

    /// The port that the WebSocket server will listen on.
    port: u16,
}

impl RemoteStreamWebSocketPlugin {
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

impl Default for RemoteStreamWebSocketPlugin {
    fn default() -> Self {
        Self {
            address: DEFAULT_ADDR,
            port: DEFAULT_PORT,
        }
    }
}

impl Plugin for RemoteStreamWebSocketPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(HostAddress(self.address))
            .insert_resource(HostPort(self.port))
            .add_systems(Startup, start_server);
    }
}

#[derive(Debug, Resource)]
pub struct HostAddress(pub IpAddr);

#[derive(Debug, Resource, Reflect)]
pub struct HostPort(pub u16);

fn start_server(sender: Res<StreamSender>, address: Res<HostAddress>, remote_port: Res<HostPort>) {
    IoTaskPool::get()
        .spawn(server_main(address.0, remote_port.0, sender.clone()))
        .detach();
}

struct TcpClient {
    id: StreamClientId,
    stream: Async<TcpStream>,
}

async fn server_main(
    address: IpAddr,
    port: u16,
    request_sender: Sender<StreamMessage>,
) -> anyhow::Result<()> {
    let listener = Async::<TcpListener>::bind((address, port))?;
    let mut client_id: usize = 0;
    loop {
        let (stream, _) = listener.accept().await?;
        client_id = client_id.wrapping_add(1);
        let client = TcpClient {
            id: StreamClientId(client_id),
            stream,
        };
        let request_sender = request_sender.clone();
        IoTaskPool::get()
            .spawn(async move {
                let _ = handle_client(client, request_sender).await;
            })
            .detach();
    }
}

async fn handle_client(
    client: TcpClient,
    request_sender: Sender<StreamMessage>,
) -> anyhow::Result<()> {
    http1::Builder::new()
        .keep_alive(true)
        .timer(SmolTimer::new())
        .serve_connection(
            FuturesIo::new(client.stream),
            service::service_fn(|request| process_request(request, &request_sender, client.id)),
        )
        .with_upgrades()
        .await?;

    Ok(())
}

async fn process_request(
    mut request: Request<Incoming>,
    request_sender: &Sender<StreamMessage>,
    client_id: StreamClientId,
) -> anyhow::Result<Response<Full<Bytes>>> {
    let default_origin = HeaderValue::from_static("");
    let origin = request.headers().get(ORIGIN).unwrap_or(&default_origin);

    if request.method() == Method::OPTIONS {
        let response = Response::builder()
            .status(200)
            .header(ACCESS_CONTROL_ALLOW_METHODS, "*")
            .header(ACCESS_CONTROL_ALLOW_ORIGIN, origin)
            .header(ACCESS_CONTROL_MAX_AGE, "86400")
            .body(Full::new(Bytes::new()))?;

        return Ok(response);
    }

    if hyper_tungstenite::is_upgrade_request(&request) {
        let (response, websocket) = hyper_tungstenite::upgrade(&mut request, None)?;

        let body = match validate_websocket_request(&request) {
            Ok(body) => body,
            Err(err) => {
                let response = serde_json::to_string(&BrpError {
                    code: error_codes::INVALID_REQUEST,
                    message: format!("{err}"),
                    data: None,
                })?;

                return Ok(Response::new(Full::new(response.into_bytes().into())));
            }
        };

        IoTaskPool::get()
            .spawn(process_websocket_stream(
                websocket,
                request_sender.clone(),
                body,
                client_id,
            ))
            .detach();

        return Ok(response);
    }

    let response_body = serde_json::to_string(&BrpError {
        code: error_codes::INVALID_REQUEST,
        message: "Invalid request".into(),
        data: None,
    })?;

    let response = Response::builder()
        .status(400)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, origin)
        .body(Full::new(response_body.into_bytes().into()))
        .unwrap();

    return Ok(response);
}

async fn process_websocket_stream(
    ws: HyperWebsocket,
    request_sender: Sender<StreamMessage>,
    request: BrpRequest,
    client_id: StreamClientId,
) -> anyhow::Result<()> {
    let ws = ws.await?;

    let (write_stream, read_stream) = ws.split();

    let (result_sender, result_receiver) = channel::bounded(32);

    let id = request.id.clone();

    IoTaskPool::get()
        .spawn(send_stream_response(write_stream, result_receiver, id))
        .detach();

    send_stream_message(
        read_stream,
        request_sender.clone(),
        request,
        result_sender,
        client_id,
    )
    .await?;

    Ok(())
}

const QUERY_KEY: &str = "body";

fn validate_websocket_request(request: &Request<Incoming>) -> anyhow::Result<BrpRequest> {
    let body = request
        .uri()
        .query()
        .and_then(|query| {
            // Simple query string parsing
            for pair in query.split('&') {
                let mut it = pair.split('=').take(2);
                match (it.next(), it.next()) {
                    (Some(k), Some(v)) if k == QUERY_KEY => return Some(v),
                    _ => {}
                };
            }
            None
        })
        .ok_or_else(|| anyhow::anyhow!("Missing body"))?;

    let body = urlencoding::decode(body)?.into_owned();

    match serde_json::from_str::<BrpRequest>(&body) {
        Ok(req) => {
            if req.jsonrpc != "2.0" {
                anyhow::bail!("JSON-RPC request requires `\"jsonrpc\": \"2.0\"`")
            }

            Ok(req)
        }
        Err(err) => anyhow::bail!(err),
    }
}

async fn send_stream_message(
    mut stream: SplitStream<HyperWebsocketStream>,
    sender: Sender<StreamMessage>,
    request: BrpRequest,
    result_sender: Sender<BrpResult>,
    client_id: StreamClientId,
) -> anyhow::Result<()> {
    let _ = sender
        .send(StreamMessage {
            client_id,
            kind: StreamMessageKind::Connect(BrpMessage {
                method: request.method,
                params: request.params,
                sender: result_sender,
            }),
        })
        .await?;
    while let Some(message) = stream.next().await {
        match message {
            Ok(Message::Close(_)) | Err(_) => break,
            _ => {}
        }
    }
    let _ = sender
        .send(StreamMessage {
            client_id,
            kind: StreamMessageKind::Disconnect,
        })
        .await?;

    Ok(())
}

async fn send_stream_response(
    mut stream: SplitSink<HyperWebsocketStream, Message>,
    result_receiver: Receiver<BrpResult>,
    id: Option<Value>,
) -> anyhow::Result<()> {
    while let Ok(result) = result_receiver.recv().await {
        let response = serde_json::to_string(&BrpResponse::new(id.clone(), result))?;
        stream.send(Message::text(response)).await?;
    }

    Ok(())
}
