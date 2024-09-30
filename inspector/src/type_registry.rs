use bevy::{
    prelude::*,
    reflect::{
        serde::TypedReflectSerializer, NamedField, TypeInfo, TypeRegistry, UnnamedField,
        VariantInfo,
    },
    utils::TypeIdMap,
};
use serde_json::{json, Value};

use crate::{InspectorEvent, TrackedData};

/// Any type that is ZST or if has no reflected fields
#[derive(Default, Deref, DerefMut)]
pub struct ZeroSizedTypes(TypeIdMap<()>);

impl TrackedData {
    pub fn track_type_registry(
        &mut self,
        events: &mut Vec<InspectorEvent>,
        type_registry: &TypeRegistry,
        zsts: &mut ZeroSizedTypes,
    ) {
        if self.type_registry {
            return;
        }

        self.type_registry = true;
        let types = serialize_type_registry(&type_registry, zsts);
        events.push(InspectorEvent::TypeRegistry { types });
    }
}

fn serialize_type_registry(registry: &TypeRegistry, zsts: &mut ZeroSizedTypes) -> Vec<Value> {
    let types = registry
        .iter()
        .map(|registration| {
            let default_value = registration
                .data::<ReflectDefault>()
                .map(|d| {
                    let reflect = d.default();
                    let serializer =
                        TypedReflectSerializer::new(reflect.as_partial_reflect(), &registry);

                    serde_json::to_value(serializer).ok()
                })
                .flatten();

            let type_name = registration.type_info().type_path();
            let type_info = match registration.type_info() {
                TypeInfo::Struct(info) => {
                    if info.field_len() == 0 {
                        zsts.insert(info.type_id(), ());
                    }
                    serialize_struct(info.iter(), default_value)
                }
                TypeInfo::TupleStruct(info) => {
                    if info.field_len() == 0 {
                        zsts.insert(info.type_id(), ());
                    }

                    let fields = info
                        .iter()
                        .enumerate()
                        .map(|field| {
                            json!({
                                "name": field.0,
                                "type": field.1.type_path()
                            })
                        })
                        .collect::<Vec<_>>();

                    json!({
                        "kind": "struct",
                        "fields": fields,
                        "default": default_value
                    })
                }
                TypeInfo::Tuple(info) => serialize_tuple(info.iter()),
                TypeInfo::List(info) => {
                    let item = info.item_ty().path();
                    let capacity: Option<usize> = None;

                    json!({
                        "kind": "array",
                        "item": item,
                        "capacity": capacity,
                        "default": default_value
                    })
                }
                TypeInfo::Array(info) => {
                    let item = info.item_ty().path();
                    let capacity = info.capacity();

                    json!({
                        "kind": "array",
                        "item": item,
                        "capacity": capacity,
                        "default": default_value
                    })
                }
                TypeInfo::Map(info) => {
                    let key_type = info.key_ty().path();
                    let value_type = info.value_ty().path();

                    json!({
                        "kind": "map",
                        "key": key_type,
                        "value": value_type,
                        "default": default_value
                    })
                }
                TypeInfo::Set(infi) => {
                    let item = infi.value_ty().path();

                    json!({
                        "kind": "set",
                        "item": item,
                        "default": default_value
                    })
                }
                TypeInfo::Enum(info) => {
                    let variants = info
                        .iter()
                        .map(|variant| {
                            let name = variant.name();
                            let variant = match variant {
                                VariantInfo::Struct(info) => serialize_struct(info.iter(), None),
                                VariantInfo::Tuple(info) => serialize_tuple(info.iter()),
                                VariantInfo::Unit(info) => {
                                    let name = info.name();
                                    json!({
                                        "kind": "unit",
                                        "name": name
                                    })
                                }
                            };

                            json!({
                                "name": name,
                                "variant": variant
                            })
                        })
                        .collect::<Vec<_>>();

                    if info.variant_len() == 0 {
                        zsts.insert(info.type_id(), ());
                    }

                    let name = info.type_path();

                    json!({
                        "kind": "enum",
                        "name": name,
                        "variants": variants,
                        "default": default_value
                    })
                }
                TypeInfo::Opaque(info) => {
                    let name = info.type_path();
                    json!({
                        "kind": "opaque",
                        "name": name,
                        "default": default_value
                    })
                }
            };

            json!([type_name, type_info])
        })
        .collect::<Vec<_>>();

    types
}

fn serialize_struct<'a>(
    s: impl Iterator<Item = &'a NamedField>,
    default_value: Option<Value>,
) -> Value {
    let fields = s
        .map(|field| {
            let field_name = field.name();
            let field_type = field.type_info().map(|info| info.type_path());
            json!({
                "name": field_name,
                "type": field_type
            })
        })
        .collect::<Vec<_>>();

    json!({
        "kind": "struct",
        "fields": fields,
        "default": default_value
    })
}

fn serialize_tuple<'a>(s: impl Iterator<Item = &'a UnnamedField>) -> Value {
    let fields = s.map(|field| field.type_path()).collect::<Vec<_>>();

    json!({
        "kind": "tuple",
        "fields": fields
    })
}
