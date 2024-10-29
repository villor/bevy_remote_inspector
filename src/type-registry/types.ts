import {
  TEnumVariantStruct,
  TEnumVariantTuple,
  TValue,
  TValueObject,
  TypeName,
  TypeRegistry,
} from './useTypeRegistry';

export const bevyTypes = {
  ENTITY: 'bevy_ecs::entity::Entity',
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
  COMPUTED_NODE: 'bevy_ui::ui_node::ComputedNode',
  NODE: 'bevy_ui::ui_node::Node',
  TEXT: 'bevy_ui::widget::text::Text',
  TEXT_LAYOUT_INFO: 'bevy_text::pipeline::TextLayoutInfo',
  GLOBAL_TRANSFORM:
    'bevy_transform::components::global_transform::GlobalTransform',
  VIEW_VISIBILITY: 'bevy_render::view::visibility::ViewVisibility',
  COLOR: 'bevy_color::color::Color',
};

export function resolveTypeDefaultValue(
  typeName: TypeName,
  registry: TypeRegistry
): TValue | undefined {
  const typeInfo = registry.get(typeName);
  if (!typeInfo) {
    return undefined;
  }

  if (typeInfo.default !== undefined) {
    return typeInfo.default;
  }

  if (isNumberType(typeName)) {
    return 1;
  }

  if (typeInfo.kind === 'struct') {
    if (typeInfo.fields.length === 0) {
      return null;
    }

    const value: TValueObject = {};

    for (const field of typeInfo.fields) {
      value[field.name] = resolveTypeDefaultValue(field.type, registry)!;
    }

    return value;
  }

  if (typeInfo.kind === 'tuple_struct') {
    if (typeInfo.fields.length === 1) {
      return resolveTypeDefaultValue(typeInfo.fields[0], registry);
    }

    return typeInfo.fields.map((field) => {
      return resolveTypeDefaultValue(field, registry)!;
    });
  }

  if (typeInfo.kind === 'tuple') {
    return typeInfo.fields.map((field) => {
      return resolveTypeDefaultValue(field, registry)!;
    });
  }

  if (typeInfo.kind === 'array') {
    if (typeInfo.capacity === null) {
      return [];
    }
    return new Array(typeInfo.capacity)
      .fill(0)
      .map(() => resolveTypeDefaultValue(typeInfo.item, registry)!);
  }

  if (typeInfo.kind === 'map') {
    return {};
  }

  if (typeInfo.kind === 'set') {
    return [];
  }

  if (typeInfo.kind === 'enum') {
    if (isOptionType(typeName)) {
      return null;
    }

    const variant = typeInfo.variants[0];

    if (variant.kind === 'unit') {
      return variant.name;
    }

    return {
      [variant.name]: resolveEnumVariantDefaultValue(variant, registry)!,
    };
  }
}

export function resolveEnumVariantDefaultValue(
  variant: TEnumVariantTuple | TEnumVariantStruct,
  registry: TypeRegistry
) {
  if (variant.kind === 'tuple') {
    if (variant.fields.length === 1) {
      return resolveTypeDefaultValue(variant.fields[0], registry);
    }

    return variant.fields.map((field) => {
      return resolveTypeDefaultValue(field, registry)!;
    });
  }

  const value: TValueObject = {};

  for (const field of variant.fields) {
    value[field.name] = resolveTypeDefaultValue(field.type, registry)!;
  }
  return value;
}

export function isOptionType(type: TypeName) {
  return type.startsWith('core::option::Option<');
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
  return numberTypes.includes(type) || type.startsWith('core::num::NonZero');
}

export function isUnsignedIntegerType(type: TypeName) {
  return type.startsWith('u') && isNumberType(type);
}

export function isStringType(type: TypeName) {
  return type === 'alloc::string::String';
}
