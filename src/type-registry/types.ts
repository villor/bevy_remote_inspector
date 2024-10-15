import { TypeName } from './useTypeRegistry';

export const bevyTypes = {
  PARENT: 'bevy_hierarchy::components::parent::Parent',
  NAME: 'bevy_core::name::Name',
  CAMERA_3D: 'bevy_core_pipeline::core_3d::camera_3d::Camera3d',
  POINT_LIGHT: 'bevy_pbr::light::point_light::PointLight',
  MESH_3D: 'bevy_render::mesh::components::Mesh3d',
  OBSERVER: 'bevy_ecs::observer::runner::Observer',
  WINDOW: 'bevy_window::window::Window',
  SYSTEM_ID_MARKER: 'bevy_ecs::system::system_registry::SystemIdMarker',
  MONITOR: 'bevy_window::monitor::Monitor',
  PRIMARY_MONITOR: 'bevy_window::monitor::PrimaryMonitor',
  POINTER_ID: 'bevy_picking::pointer::PointerId',
};

export function isOptionType(type: TypeName) {
  return type.startsWith('Option<');
}

const numberTypes = [
  'u8',
  'i8',
  'u16',
  'i16',
  'u32',
  'i32',
  'u64',
  'i64',
  'u128',
  'i128',
  'usize',
  'isize',
  'f32',
  'f64',
];

export function isNumberType(type: TypeName) {
  return numberTypes.includes(type);
}
