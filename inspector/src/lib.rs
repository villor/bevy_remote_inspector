use bevy::prelude::*;

pub struct BevyRemoteInspectorPlugin;

impl Plugin for BevyRemoteInspectorPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, || {
            println!("Hello, world!");
        });
    }
}
