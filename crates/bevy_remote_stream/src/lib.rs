#[cfg(feature = "websocket")]
pub mod websocket;

use std::sync::RwLock;

use bevy::{
    ecs::system::SystemId,
    prelude::*,
    remote::{error_codes, BrpError, BrpMessage, BrpResult},
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
        let mut stream_methods = StreamMethods::new();

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
                    on_update: app
                        .main_mut()
                        .world_mut()
                        .register_boxed_system(systems.update),
                },
            );
        }

        app.insert_resource(stream_methods)
            .init_resource::<ActiveStreams>()
            .add_systems(PreStartup, setup_channel)
            .add_systems(Update, process_remote_requests);
    }
}

#[derive(Debug, Clone)]
pub struct RemoteStreamHandlers {
    pub on_connect: Option<StreamHandler>,
    pub on_disconnect: Option<SystemId<StreamHandlerInput>>,
    pub on_update: StreamHandler,
}

pub type StreamHandler = SystemId<StreamHandlerInput, Option<BrpResult>>;
pub type StreamHandlerInput = In<(StreamClientId, Option<Value>)>;

#[derive(Debug)]
pub struct RemoteStreamHandlersBuilder {
    on_connect: Option<Box<dyn System<In = StreamHandlerInput, Out = Option<BrpResult>>>>,
    on_disconnect: Option<Box<dyn System<In = StreamHandlerInput, Out = ()>>>,
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

    pub fn on_disconnect<M>(mut self, system: impl IntoSystem<StreamHandlerInput, (), M>) -> Self {
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

#[derive(Resource, Deref, DerefMut)]
pub struct StreamSender(Sender<StreamMessage>);

#[derive(Resource, Deref, DerefMut)]
pub struct StreamReceiver(Receiver<StreamMessage>);

pub struct StreamMessage {
    client_id: StreamClientId,
    kind: StreamMessageKind,
}

pub enum StreamMessageKind {
    Connect(BrpMessage),
    Disconnect,
}

#[derive(Resource, Deref, DerefMut, Default)]
pub struct ActiveStreams(HashMap<StreamClientId, ActiveStream>);

pub struct ActiveStream {
    message: BrpMessage,
    on_update: StreamHandler,
    on_disconnect: Option<SystemId<StreamHandlerInput>>,
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
                StreamMessageKind::Connect(message) => {
                    let Some(handler) = methods.0.get(&message.method) else {
                        let _ = message.sender.force_send(Err(BrpError {
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
                StreamMessageKind::Disconnect => {
                    let stream = world
                        .resource_mut::<ActiveStreams>()
                        .remove(&stream_message.client_id);

                    if let Some(stream) = stream {
                        if let Some(on_disconnect) = stream.on_disconnect {
                            let _ = world.run_system_with_input(
                                on_disconnect,
                                (stream_message.client_id, stream.message.params),
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
    client_id: StreamClientId,
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
            let _ = message.sender.force_send(Err(BrpError {
                code: error_codes::INTERNAL_ERROR,
                message: format!("Failed to run method handler: {error}"),
                data: None,
            }));

            true
        }
    }
}
