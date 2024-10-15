#[cfg(feature = "websocket")]
pub mod websocket;

use std::sync::RwLock;

use bevy::{
    ecs::system::SystemId,
    prelude::*,
    remote::{error_codes, BrpError, BrpRequest, BrpResponse, BrpResult},
    utils::HashMap,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use smol::channel::{self, Receiver, Sender};

const CHANNEL_SIZE: usize = 16;

pub struct RemoteStreamPlugin {
    methods: RwLock<Vec<(String, RemoteStreamHandlersBuilder)>>,
}

impl RemoteStreamPlugin {
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
            methods: RwLock::new(vec![]),
        }
    }
}

impl Plugin for RemoteStreamPlugin {
    fn build(&self, app: &mut App) {
        let mut stream_methods = StreamMethods::default();

        let plugin_methods = &mut *self.methods.write().unwrap();

        for (name, systems) in plugin_methods.drain(..) {
            stream_methods.insert(
                name,
                RemoteStreamHandlers {
                    on_connect: systems
                        .on_connect
                        .map(|sys| app.main_mut().world_mut().register_boxed_system(sys)),
                    on_disconnect: systems
                        .on_disconnect
                        .map(|sys| app.main_mut().world_mut().register_boxed_system(sys)),
                    update: app
                        .main_mut()
                        .world_mut()
                        .register_boxed_system(systems.update),
                    on_data: systems
                        .on_data
                        .map(|sys| app.main_mut().world_mut().register_boxed_system(sys)),
                },
            );
        }

        app.insert_resource(stream_methods)
            .init_resource::<ActiveStreams>()
            .add_systems(PreStartup, setup_channel)
            .add_systems(Update, process_remote_requests)
            .add_systems(Update, on_app_exit.run_if(on_event::<AppExit>));
    }
}

#[derive(Debug, Clone)]
pub struct RemoteStreamHandlers {
    pub on_connect: Option<StreamHandler>,
    pub on_disconnect: Option<SystemId<StreamHandlerInputRef<'static>>>,
    pub on_data: Option<OnDataHandler>,
    pub update: StreamHandler,
}

pub struct StreamHandlerInput {
    pub client_id: StreamClientId,
    pub params: Option<Value>,
}

pub type StreamHandlerInputRef<'a> = InRef<'a, StreamHandlerInput>;
pub type StreamHandler = SystemId<StreamHandlerInputRef<'static>, Option<BrpResult>>;
pub type OnDataHandlerInput = In<(StreamClientId, BrpRequest)>;
pub type OnDataHandler = SystemId<OnDataHandlerInput, Option<BrpResult>>;

#[derive(Debug)]
pub struct RemoteStreamHandlersBuilder {
    on_connect:
        Option<Box<dyn System<In = StreamHandlerInputRef<'static>, Out = Option<BrpResult>>>>,
    on_disconnect: Option<Box<dyn System<In = StreamHandlerInputRef<'static>, Out = ()>>>,
    on_data: Option<Box<dyn System<In = OnDataHandlerInput, Out = Option<BrpResult>>>>,
    update: Box<dyn System<In = StreamHandlerInputRef<'static>, Out = Option<BrpResult>>>,
}

impl RemoteStreamHandlersBuilder {
    pub fn new<M>(
        update: impl IntoSystem<StreamHandlerInputRef<'static>, Option<BrpResult>, M>,
    ) -> Self {
        Self {
            on_connect: None,
            on_disconnect: None,
            on_data: None,
            update: Box::new(IntoSystem::into_system(update)),
        }
    }

    pub fn on_connect<M>(
        mut self,
        system: impl IntoSystem<StreamHandlerInputRef<'static>, Option<BrpResult>, M>,
    ) -> Self {
        self.on_connect = Some(Box::new(IntoSystem::into_system(system)));
        self
    }

    pub fn on_disconnect<M>(
        mut self,
        system: impl IntoSystem<StreamHandlerInputRef<'static>, (), M>,
    ) -> Self {
        self.on_disconnect = Some(Box::new(IntoSystem::into_system(system)));
        self
    }
}

/// Holds all implementations of methods known to the server.
#[derive(Debug, Resource, Default)]
pub struct StreamMethods(HashMap<String, RemoteStreamHandlers>);

impl StreamMethods {
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

#[derive(Resource, Deref, DerefMut)]
pub struct StreamSender(Sender<StreamMessage>);

#[derive(Resource, Deref, DerefMut)]
pub struct StreamReceiver(Receiver<StreamMessage>);

pub struct StreamMessage {
    client_id: StreamClientId,
    kind: StreamMessageKind,
}

#[derive(Clone)]
pub struct BrpStreamMessage {
    /// The request method.
    pub method: String,

    /// The request params.
    pub params: Option<Value>,

    /// The channel on which the response is to be sent.
    ///
    /// The value sent here is serialized and sent back to the client.
    pub sender: Sender<BrpResponse>,
}

pub enum StreamMessageKind {
    Connect(Option<Value>, BrpStreamMessage),
    Disconnect,
    Data(Value),
}

#[derive(Resource, Deref, DerefMut, Default)]
struct ActiveStreams(HashMap<StreamClientId, ActiveStream>);

struct ActiveStream {
    request_id: Option<Value>,
    sender: ActiveStreamSender,
    input: StreamHandlerInput,
    on_update: StreamHandler,
    on_disconnect: Option<SystemId<StreamHandlerInputRef<'static>>>,
    on_data: Option<OnDataHandler>,
}

struct ActiveStreamSender(Sender<BrpResponse>);

impl ActiveStreamSender {
    fn send(&self, id: Option<Value>, result: BrpResult) -> bool {
        let res = self.0.force_send(BrpResponse::new(id, result));

        match res {
            Ok(Some(_)) => {
                warn!("Channel queue is full, dropping response. Consider increasing the channel size.");
            }
            _ => {}
        }

        return res.is_ok();
    }
}

#[derive(Default, Clone, Copy, Hash, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct StreamClientId(usize);

fn setup_channel(mut commands: Commands) {
    let (sender, receiver) = channel::bounded(CHANNEL_SIZE);
    commands.insert_resource(StreamSender(sender));
    commands.insert_resource(StreamReceiver(receiver));
}

fn process_remote_requests(world: &mut World) {
    if !world.contains_resource::<StreamReceiver>() {
        return;
    }

    while let Ok(stream_message) = world.resource_mut::<StreamReceiver>().try_recv() {
        world.resource_scope(
            |world, methods: Mut<StreamMethods>| match stream_message.kind {
                StreamMessageKind::Connect(req_id, message) => {
                    let Some(handler) = methods.0.get(&message.method) else {
                        let _ = message.sender.force_send(BrpResponse::new(
                            req_id,
                            Err(BrpError {
                                code: error_codes::METHOD_NOT_FOUND,
                                message: format!("Method `{}` not found", message.method),
                                data: None,
                            }),
                        ));
                        return;
                    };

                    let input = StreamHandlerInput {
                        client_id: stream_message.client_id,
                        params: message.params,
                    };
                    let sender = ActiveStreamSender(message.sender);

                    if let Some(on_connect) = handler.on_connect {
                        if run_handler(world, on_connect, &input, &sender, req_id.as_ref()) {
                            return;
                        }
                    }

                    world.resource_mut::<ActiveStreams>().insert(
                        stream_message.client_id,
                        ActiveStream {
                            request_id: req_id,
                            input,
                            sender,
                            on_update: handler.update,
                            on_disconnect: handler.on_disconnect,
                            on_data: handler.on_data,
                        },
                    );
                }
                StreamMessageKind::Disconnect => {
                    let stream = world
                        .resource_mut::<ActiveStreams>()
                        .remove(&stream_message.client_id);

                    if let Some(stream) = stream {
                        if let Some(on_disconnect) = stream.on_disconnect {
                            let _ = world.run_system_with_input(on_disconnect, &stream.input);
                        }
                    }
                }
                StreamMessageKind::Data(value) => {
                    world.resource_scope(|world, active_streams: Mut<ActiveStreams>| {
                        let stream = active_streams.get(&stream_message.client_id);

                        let Some(stream) = stream else {
                            return;
                        };

                        let request: BrpRequest = match serde_json::from_value(value) {
                            Ok(v) => v,
                            Err(err) => {
                                stream.sender.send(
                                    None,
                                    Err(BrpError {
                                        code: error_codes::INVALID_REQUEST,
                                        message: format!("Failed to parse request: {err}"),
                                        data: None,
                                    }),
                                );
                                return;
                            }
                        };

                        let Some(on_data) = stream.on_data else {
                            return;
                        };

                        let request_id = request.id.clone();
                        let result = world
                            .run_system_with_input(on_data, (stream_message.client_id, request));

                        match result {
                            Ok(result) => {
                                let Some(result) = result else {
                                    return;
                                };

                                if request_id.is_none() {
                                    return;
                                }

                                stream.sender.send(request_id, result);
                            }
                            Err(error) => {
                                stream.sender.send(
                                    request_id,
                                    Err(BrpError {
                                        code: error_codes::INTERNAL_ERROR,
                                        message: format!("Failed to run method handler: {error}"),
                                        data: None,
                                    }),
                                );
                            }
                        }
                    })
                }
            },
        );
    }

    world.resource_scope(|world, mut streams: Mut<ActiveStreams>| {
        let to_remove = streams
            .iter()
            .filter_map(|(client_id, stream)| {
                run_handler(
                    world,
                    stream.on_update,
                    &stream.input,
                    &stream.sender,
                    stream.request_id.as_ref(),
                )
                .then_some(*client_id)
            })
            .collect::<Vec<_>>();

        for client_id in to_remove {
            streams.remove(&client_id);
        }
    });
}

fn on_app_exit(mut active_streams: ResMut<ActiveStreams>) {
    active_streams.clear();
}

#[must_use]
fn run_handler(
    world: &mut World,
    system_id: StreamHandler,
    input: &StreamHandlerInput,
    sender: &ActiveStreamSender,
    request_id: Option<&Value>,
) -> bool {
    let result = world.run_system_with_input(system_id, &(input));

    match result {
        Ok(handler_result) => {
            if let Some(handler_result) = handler_result {
                let handler_err = handler_result.is_err();
                let channel_ok = sender.send(request_id.cloned(), handler_result);

                // Remove when the handler return error or channel closed
                handler_err || !channel_ok
            } else {
                false
            }
        }
        Err(error) => {
            sender.send(
                request_id.cloned(),
                Err(BrpError {
                    code: error_codes::INTERNAL_ERROR,
                    message: format!("Failed to run method handler: {error}"),
                    data: None,
                }),
            );

            true
        }
    }
}
