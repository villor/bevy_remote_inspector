//! A Bevy app that you can connect to with the BRP and edit.

use bevy::{input::common_conditions::input_just_pressed, prelude::*, remote::RemotePlugin};
use bevy_remote_inspector::{
    remote_stream::{websocket::RemoteStreamWebSocketPlugin, RemoteStreamPlugin},
    RemoteInspectorPlugin,
};
use serde::{Deserialize, Serialize};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins((
            RemotePlugin::default(),
            RemoteStreamPlugin::default(),
            RemoteStreamWebSocketPlugin::default(),
            RemoteInspectorPlugin,
        ))
        .add_systems(Startup, setup)
        .add_systems(
            Update,
            (
                rotate,
                add_cube_children.run_if(input_just_pressed(KeyCode::KeyA)),
                remove_cube_children.run_if(input_just_pressed(KeyCode::KeyS)),
            ),
        )
        .register_type::<Cube>()
        .register_type::<CubeChild>()
        .register_type::<Test>()
        .run();
}

fn setup(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // circular base
    commands.spawn((
        Mesh3d(meshes.add(Circle::new(4.0))),
        MeshMaterial3d(materials.add(Color::WHITE)),
        Transform::from_rotation(Quat::from_rotation_x(-std::f32::consts::FRAC_PI_2)),
    ));

    // cube
    commands
        .spawn((
            Mesh3d(meshes.add(Cuboid::new(1.0, 1.0, 1.0))),
            MeshMaterial3d(materials.add(Color::srgb_u8(124, 144, 255))),
            Transform::from_xyz(0.0, 0.5, 0.0),
            Cube(1.0),
        ))
        .with_children(|parent| {
            parent.spawn((CubeChild, Name::new("CubeChild")));
        });

    // light
    commands.spawn((
        PointLight {
            shadows_enabled: true,
            ..default()
        },
        Transform::from_xyz(4.0, 8.0, 4.0),
    ));

    // camera
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(-2.5, 4.5, 9.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));
}

fn rotate(mut query: Query<&mut Transform, With<Cube>>, time: Res<Time>) {
    for mut transform in &mut query {
        transform.rotate_y(time.delta_seconds() / 2.);
    }
}

fn add_cube_children(mut commands: Commands, query: Query<Entity, With<Cube>>) {
    commands.entity(query.single()).with_children(|parent| {
        parent.spawn((CubeChild, Name::new("CubeChild")));
    });
}

fn remove_cube_children(mut commands: Commands, query: Query<Entity, With<Cube>>) {
    for entity in query.iter() {
        commands.entity(entity).despawn_descendants();
    }
}

#[derive(Component, Reflect, Serialize, Deserialize)]
#[reflect(Component, Serialize, Deserialize)]
struct Cube(f32);

#[derive(Component, Reflect, Serialize, Deserialize)]
#[reflect(Component, Serialize, Deserialize)]
struct CubeChild;

#[derive(Component, Reflect, Serialize, Clone, Copy, Deserialize)]
#[reflect(Component)]
struct Test(usize);
