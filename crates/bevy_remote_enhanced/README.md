# bevy_remote_enhanced

Fork of `bevy_remote` to extend its functionality to support `bevy_remote_inspector`.

- Extends `BrpResponse` with:
  - `timestamp` and `tick`
    - The timestamp and tick of for when the request was processed.
    - Useful for remote debugging, and ensuring correct state when combining for example a `bevy/get` and a `bevy/get+watch`.
- +watch requests will now yield an initial response to confirm that the watch was started, containing a `watch_id`. `watch_id` is a server owned ID that can be used for state management and un-watching. Not to be confused with the current `id` field, which is a client owned id that might be unset or contain duplicates.
- Adds `bevy/unwatch` method for unwatching any ongoing +watch requests with the supplied `watch_id`. Necessary for streaming transports like WebSocket where we can't just close the connection.
- Makes `RemoteLast` system schedule public to allow proper scheduling of custom systems.

_This crate is meant as a temporary band-aid, and will be archived if/when the functionality is upstreamed or replaced with better solutions._