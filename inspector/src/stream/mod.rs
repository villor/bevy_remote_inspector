use std::{
    net::{IpAddr, Ipv4Addr},
    sync::RwLock,
};

use anyhow::Result as AnyhowResult;
use bevy::{
    ecs::system::SystemId,
    prelude::*,
    remote::{error_codes, BrpError, BrpMessage, BrpRequest, BrpResponse, BrpResult},
    tasks::IoTaskPool,
    utils::HashMap,
};
use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use http_body_util::Full;
use hyper::{
    body::{Bytes, Incoming},
    server::conn::http1,
    service, Request, Response,
};
use hyper_tungstenite::{HyperWebsocket, HyperWebsocketStream};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use smol::{
    channel::{self, Receiver, Sender},
    Async,
};
use smol_hyper::rt::{FuturesIo, SmolTimer};
use std::net::{TcpListener, TcpStream};
use tungstenite::Message;

/// The default port that Bevy will listen on.
///
/// This value was chosen randomly.
pub const DEFAULT_PORT: u16 = 3000;

/// The default host address that Bevy will use for its server.
pub const DEFAULT_ADDR: IpAddr = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));

const CHANNEL_SIZE: usize = 16;

/// Add this plugin to your [`App`] to allow remote connections to inspect and modify entities.
///
/// This the main plugin for `bevy_remote`. See the [crate-level documentation] for details on
/// the protocol and its default methods.
///
/// The defaults are:
/// - [`DEFAULT_ADDR`] : 127.0.0.1.
/// - [`DEFAULT_PORT`] : 15702.
///
/// [crate-level documentation]: crate
pub struct RemoteStreamPlugin {
    /// The address that Bevy will use.
    address: IpAddr,

    /// The port that Bevy will listen on.
    port: u16,

    methods: RwLock<Vec<(String, RemoteStreamHandlersBuilder)>>,
}

impl RemoteStreamPlugin {
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

    /// Add a streaming remote method to the plugin using the given `name` and `handler`.
    /// The handler will be called every frame when there is a client connected to the stream.
    /// The handler should return a `None` to indicate that there is nothing to stream.
    /// And return `Some(BrpErr)` to stop the stream.
    #[must_use]
    pub fn with_method(
        mut self,
        name: impl Into<String>,
        handlers: RemoteStreamHandlersBuilder,
    ) -> Self {
        self.methods
            .get_mut()
            .unwrap()
            .push((name.into(), handlers));
        self
    }
}

impl Default for RemoteStreamPlugin {
    fn default() -> Self {
        Self {
            address: DEFAULT_ADDR,
            port: DEFAULT_PORT,
            methods: RwLock::new(vec![]),
        }
    }
}

impl Plugin for RemoteStreamPlugin {
    fn build(&self, app: &mut App) {
        let mut stream_methods = StreamMethods::new();

        let plugin_methods = &mut *self.methods.write().unwrap();

        for (name, systems) in plugin_methods.drain(..) {
            stream_methods.insert(
                name.clone(),
                RemoteStreamHandlers {
                    on_connect: systems
                        .on_connect
                        .map(|sys| app.main_mut().world_mut().register_boxed_system(sys)),
                    on_disconnect: systems
                        .on_disconnect
                        .map(|sys| app.main_mut().world_mut().register_boxed_system(sys)),
                    on_update: app
                        .main_mut()
                        .world_mut()
                        .register_boxed_system(systems.update),
                },
            );
        }

        app.insert_resource(HostAddress(self.address))
            .insert_resource(HostPort(self.port))
            .insert_resource(stream_methods)
            .init_resource::<ActiveStreams>()
            .add_systems(Startup, start_server)
            .add_systems(Update, process_remote_requests);
    }
}

/// A resource containing the IP address that Bevy will host on.
///
/// Currently, changing this while the application is running has no effect; this merely
/// reflects the IP address that is set during the setup of the [`RemotePlugin`].
#[derive(Debug, Resource)]
pub struct HostAddress(pub IpAddr);

/// A resource containing the port number that Bevy will listen on.
///
/// Currently, changing this while the application is running has no effect; this merely
/// reflects the host that is set during the setup of the [`RemotePlugin`].
#[derive(Debug, Resource, Reflect)]
pub struct HostPort(pub u16);

#[derive(Debug, Clone)]
pub struct RemoteStreamHandlers {
    on_connect: Option<StreamHandler>,
    on_disconnect: Option<StreamHandler>,
    on_update: StreamHandler,
}

pub type StreamHandlerInput = In<(BrpStreamClientId, Option<Value>)>;

#[derive(Debug)]
pub struct RemoteStreamHandlersBuilder {
    on_connect: Option<Box<dyn System<In = StreamHandlerInput, Out = Option<BrpResult>>>>,
    on_disconnect: Option<Box<dyn System<In = StreamHandlerInput, Out = Option<BrpResult>>>>,
    update: Box<dyn System<In = StreamHandlerInput, Out = Option<BrpResult>>>,
}

impl RemoteStreamHandlersBuilder {
    pub fn new<M>(on_update: impl IntoSystem<StreamHandlerInput, Option<BrpResult>, M>) -> Self {
        Self {
            on_connect: None,
            on_disconnect: None,
            update: Box::new(IntoSystem::into_system(on_update)),
        }
    }

    pub fn on_connect<M>(
        mut self,
        system: impl IntoSystem<StreamHandlerInput, Option<BrpResult>, M>,
    ) -> Self {
        self.on_connect = Some(Box::new(IntoSystem::into_system(system)));
        self
    }

    pub fn on_disconnect<M>(
        mut self,
        system: impl IntoSystem<StreamHandlerInput, Option<BrpResult>, M>,
    ) -> Self {
        self.on_disconnect = Some(Box::new(IntoSystem::into_system(system)));
        self
    }
}

/// Holds all implementations of methods known to the server.
#[derive(Debug, Resource, Default)]
pub struct StreamMethods(HashMap<String, RemoteStreamHandlers>);

impl StreamMethods {
    /// Creates a new [`RemoteMethods`] resource with no methods registered in it.
    pub fn new() -> Self {
        default()
    }

    /// Adds a new method, replacing any existing method with that name.
    ///
    /// If there was an existing method with that name, returns its handler.
    pub fn insert(
        &mut self,
        method_name: impl Into<String>,
        handler: RemoteStreamHandlers,
    ) -> Option<RemoteStreamHandlers> {
        self.0.insert(method_name.into(), handler)
    }
}

/// A resource that receives messages sent by Bevy Remote Protocol clients.
///
/// Every frame, the `process_remote_requests` system drains this mailbox and
/// processes the messages within.
#[derive(Debug, Resource, Deref, DerefMut)]
struct StreamMailbox(Receiver<BrpStreamMessage>);

pub struct BrpStreamMessage {
    client_id: BrpStreamClientId,
    kind: BrpStreamMessageKind,
}

enum BrpStreamMessageKind {
    Connect(BrpMessage),
    Disconnect,
}

#[derive(Resource, Deref, DerefMut, Default)]
pub struct ActiveStreams(HashMap<BrpStreamClientId, ActiveStream>);

pub struct ActiveStream {
    message: BrpMessage,
    on_update: StreamHandler,
    on_disconnect: Option<StreamHandler>,
}

type StreamHandler = SystemId<StreamHandlerInput, Option<BrpResult>>;

/// A system that receives requests placed in the [`BrpMailbox`] and processes
/// them, using the [`RemoteMethods`] resource to map each request to its handler.
///
/// This needs exclusive access to the [`World`] because clients can manipulate
/// anything in the ECS.
fn process_remote_requests(world: &mut World) {
    if !world.contains_resource::<StreamMailbox>() {
        return;
    }

    while let Ok(stream_message) = world.resource_mut::<StreamMailbox>().try_recv() {
        world.resource_scope(
            |world, methods: Mut<StreamMethods>| match stream_message.kind {
                BrpStreamMessageKind::Connect(message) => {
                    let Some(handler) = methods.0.get(&message.method) else {
                        let _ = message.sender.send_blocking(Err(BrpError {
                            code: error_codes::METHOD_NOT_FOUND,
                            message: format!("Method `{}` not found", message.method),
                            data: None,
                        }));
                        return;
                    };

                    if let Some(on_connect) = handler.on_connect {
                        if run_handler(world, on_connect, message.clone(), stream_message.client_id)
                        {
                            return;
                        }
                    }

                    world.resource_mut::<ActiveStreams>().insert(
                        stream_message.client_id,
                        ActiveStream {
                            message,
                            on_update: handler.on_update,
                            on_disconnect: handler.on_disconnect,
                        },
                    );
                }
                BrpStreamMessageKind::Disconnect => {
                    let stream = world
                        .resource_mut::<ActiveStreams>()
                        .remove(&stream_message.client_id);

                    if let Some(stream) = stream {
                        if let Some(on_disconnect) = stream.on_disconnect {
                            let _ = run_handler(
                                world,
                                on_disconnect,
                                stream.message,
                                stream_message.client_id,
                            );
                        }
                    }
                }
            },
        );
    }

    world.resource_scope(|world, mut streams: Mut<ActiveStreams>| {
        let to_remove = streams
            .iter()
            .filter_map(|(client_id, stream)| {
                run_handler(world, stream.on_update, stream.message.clone(), *client_id)
                    .then_some(*client_id)
            })
            .collect::<Vec<_>>();

        for client_id in to_remove {
            streams.remove(&client_id);
        }
    });
}

#[must_use]
fn run_handler(
    world: &mut World,
    system_id: StreamHandler,
    message: BrpMessage,
    client_id: BrpStreamClientId,
) -> bool {
    let result = world.run_system_with_input(system_id, (client_id, message.params));

    match result {
        Ok(handler_result) => {
            if let Some(handler_result) = handler_result {
                let handler_err = handler_result.is_err();
                let channel_result = message.sender.send_blocking(handler_result);

                // Remove when the handler return error or channel closed
                handler_err || channel_result.is_err()
            } else {
                false
            }
        }
        Err(error) => {
            let _ = message.sender.send_blocking(Err(BrpError {
                code: error_codes::INTERNAL_ERROR,
                message: format!("Failed to run method handler: {error}"),
                data: None,
            }));

            true
        }
    }
}

/// A system that starts up the Bevy Remote Protocol server.
fn start_server(mut commands: Commands, address: Res<HostAddress>, remote_port: Res<HostPort>) {
    // Create the channel and the mailbox.
    let (request_sender, request_receiver) = channel::bounded(CHANNEL_SIZE);

    commands.insert_resource(StreamMailbox(request_receiver));
    IoTaskPool::get()
        .spawn(server_main(address.0, remote_port.0, request_sender))
        .detach();
}

struct TcpClient {
    id: BrpStreamClientId,
    stream: Async<TcpStream>,
}

/// The Bevy Remote Protocol server main loop.
async fn server_main(
    address: IpAddr,
    port: u16,
    request_sender: Sender<BrpStreamMessage>,
) -> AnyhowResult<()> {
    let listener = Async::<TcpListener>::bind((address, port))?;
    let mut client_id: usize = 0;
    loop {
        let (stream, _) = listener.accept().await?;
        client_id = client_id.wrapping_add(1);
        let client = TcpClient {
            id: BrpStreamClientId(client_id),
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
#[derive(
    Deref, DerefMut, Default, Clone, Copy, Hash, PartialEq, Eq, Debug, Serialize, Deserialize,
)]
pub struct BrpStreamClientId(usize);

async fn handle_client(
    client: TcpClient,
    request_sender: Sender<BrpStreamMessage>,
) -> AnyhowResult<()> {
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
    request_sender: &Sender<BrpStreamMessage>,
    client_id: BrpStreamClientId,
) -> AnyhowResult<Response<Full<Bytes>>> {
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

    let response = serde_json::to_string(&BrpError {
        code: error_codes::INVALID_REQUEST,
        message: "Invalid request".into(),
        data: None,
    })?;

    return Ok(Response::new(Full::new(response.into_bytes().into())));
}

async fn process_websocket_stream(
    ws: HyperWebsocket,
    request_sender: Sender<BrpStreamMessage>,
    request: BrpRequest,
    client_id: BrpStreamClientId,
) -> AnyhowResult<()> {
    let ws = ws.await?;

    let (write_stream, read_stream) = ws.split();

    let (result_sender, result_receiver) = channel::bounded(1);

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

fn validate_websocket_request(request: &Request<Incoming>) -> AnyhowResult<BrpRequest> {
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
    sender: Sender<BrpStreamMessage>,
    request: BrpRequest,
    result_sender: Sender<BrpResult>,
    client_id: BrpStreamClientId,
) -> AnyhowResult<()> {
    let _ = sender
        .send(BrpStreamMessage {
            client_id,
            kind: BrpStreamMessageKind::Connect(BrpMessage {
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
        .send(BrpStreamMessage {
            client_id,
            kind: BrpStreamMessageKind::Disconnect,
        })
        .await?;

    Ok(())
}

async fn send_stream_response(
    mut stream: SplitSink<HyperWebsocketStream, Message>,
    result_receiver: Receiver<BrpResult>,
    id: Option<Value>,
) -> AnyhowResult<()> {
    while let Ok(result) = result_receiver.recv().await {
        let response = serde_json::to_string(&BrpResponse::new(id.clone(), result))?;
        stream.send(Message::text(response)).await?;
    }

    Ok(())
}
