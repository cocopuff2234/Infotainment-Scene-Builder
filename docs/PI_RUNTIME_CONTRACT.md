# Raspberry Pi / PySide6-QML runtime contract

This document is the handoff between the Scene Builder and the Raspberry Pi head-unit runtime.
The runtime should consume the exported JSON directly; it should not need editor-specific React or
Konva code.

## Runtime profile

Every newly created or re-saved project is normalized to this profile:

```json
{
  "runtime": {
    "target": "pyside6-qml",
    "contractVersion": 1,
    "scaleMode": "fit",
    "elementOrder": "array-z-order",
    "assetBase": "."
  }
}
```

Older schema-version-1 documents without `runtime` still load. The editor adds the profile when
it parses/saves them so old drafts and cloud projects remain usable.

- `target`: the intended renderer is Python + PySide6 + QML/Qt Quick.
- `contractVersion`: version of the runtime interpretation. It is separate from `schemaVersion`.
- `scaleMode: "fit"`: preserve the 1000 x 620 design aspect ratio and fit it inside the physical display.
- `elementOrder: "array-z-order"`: elements appear from back to front in array order. Later elements
  are on top and should receive pointer/touch input before obscured elements.
- `assetBase: "."`: relative runtime assets such as audio files resolve from the directory containing
  the imported scene JSON (or the root of a future packaged scene directory).

## Startup and scene selection

1. Parse and validate the project.
2. Read `screen.width` and `screen.height` (currently fixed at 1000 x 620).
3. Find the scene whose `id` equals `startSceneId`.
4. Render that scene.
5. Keep a single `activeSceneId` in the runtime scene manager.

The runtime should reject a scene file if `startSceneId` or a navigation target does not exist.

## Coordinates and scaling

All element coordinates are design-space pixels relative to the project's `screen`.
For `scaleMode: "fit"`, use one uniform scale factor:

```text
scale = min(displayWidth / screen.width, displayHeight / screen.height)
```

Center the scaled scene in any unused horizontal/vertical space. Do not independently stretch x/y;
that would distort widgets and touch areas.

## Element stacking and touch

`scenes[].elements` is also the z-order. Index 0 is the back-most element and the last item is the
front-most element. This mirrors the editor's Backward/Forward controls.

The user-facing **Empty** component intentionally exports as `"type": "hotspot"` for schema-v1
compatibility. Render no visible content for it, but create a full touch target using its x/y/width/height.

## Navigation actions

Buttons and hotspots can carry:

```json
{
  "action": {
    "type": "navigate",
    "targetSceneId": "settings",
    "transition": {
      "type": "fade",
      "durationMs": 180
    }
  }
}
```

Supported transition types for runtime contract 1:

- `instant` - duration must be 0
- `fade`
- `slide-left`
- `slide-right`

Non-instant durations are in milliseconds and are limited to 50-5000 ms by the editor UI. QML can
implement these with opacity and x-position animations around a scene swap.

## Scene backgrounds

A scene can contain:

```json
{
  "background": {
    "color": "#071426",
    "image": "data:image/png;base64,...",
    "fit": "cover",
    "overlay": 0.2
  }
}
```

`fit` is `contain`, `cover`, or `stretch`. `overlay` is a darkening amount from 0 to 0.85.
The normal image-upload flow embeds images as data URLs. A Python loader may decode embedded image
bytes to a runtime cache file and expose that local URL to QML. Version-1 validation can also accept
HTTPS image sources for legacy/web use, so the runtime should either support those when online or
show a placeholder instead of crashing.

## Map elements

Map props are renderer-neutral but map directly onto Qt Location:

```json
{
  "type": "map",
  "props": {
    "source": "gps.location",
    "centerLat": 37.3382,
    "centerLng": -121.8863,
    "zoom": 14,
    "showCurrentLocation": true,
    "followLocation": true,
    "allowPan": true,
    "allowZoom": true,
    "tileProvider": "osm",
    "mapStyle": "standard"
  }
}
```

For runtime contract 1, `tileProvider: "osm"` maps to the Qt Location OSM plugin. The browser editor
uses Leaflet only for Preview; Leaflet is not part of the Pi runtime contract.

`source: "gps.location"` is a data-binding identifier. The runtime can initially supply mock values and
later bind the same source to a GPS adapter/Qt Positioning source without changing scene files.

## Media elements

`music`, `music-player`, and `now-playing` can carry runtime media metadata:

```json
{
  "props": {
    "source": "media.player",
    "mediaPath": "media/song.mp3",
    "artist": "Artist name",
    "autoplay": false,
    "loop": false
  }
}
```

`mediaPath` must be a relative path. Absolute paths, URL schemes, and `..` traversal are rejected by
the editor. The Python runtime should resolve it against `runtime.assetBase` and refuse any resolved
path that escapes the imported scene directory.

The initial MVP can use Qt Multimedia (`MediaPlayer`/`AudioOutput`) for playback. `now-playing` may use
the same metadata without creating a second player.

## Custom asset references

The **Custom Asset** placeholder can point at a file that will be copied with the exported scene:

```json
{
  "type": "custom",
  "props": {
    "assetFile": "assets/custom-widget.png"
  }
}
```

`assetFile` follows the same portability/security rules as `mediaPath`: relative path only, forward
slashes, no URL scheme, no absolute path, and no `..` traversal. The runtime may initially support a
small set of safe file types and otherwise render the normal custom placeholder.

## Data-bound assets

Many built-in components include a scalar `props.source`, for example:

- `vehicle.speed`
- `gps.location`
- `nav.eta`
- `media.player`
- `media.nowPlaying`

These strings are stable binding identifiers, not executable code. The Pi runtime should map them to
pre-defined providers/adapters. Scene files must never execute arbitrary Python/QML/JavaScript from
component props.

For the first runtime pass, unknown/unavailable bindings can render the element's saved `text`, `value`,
or `active` as a fallback.

## Suggested QML mapping

| Scene element | Runtime implementation |
| --- | --- |
| `button` | `Rectangle`/`Button` + action handler |
| `hotspot` (Empty) | transparent `MouseArea`/`TapHandler` |
| `label` | `Text` |
| `image` | `Image` |
| `icon` | `Text` or icon renderer |
| `panel` | `Rectangle` |
| `slider` | Qt Quick Controls `Slider` |
| `toggle` | Qt Quick Controls `Switch` |
| `map` | Qt Location `Map` + optional position marker |
| `music`, `music-player` | visual item + Qt Multimedia player controls |
| `now-playing` | metadata display |
| `volume`, `climate` | custom QML components using saved `value` |
| vehicle/info cards | custom QML components, falling back to saved text |
| `custom` | resolve `assetFile` safely, otherwise show a placeholder |

## Failure behavior

The device runtime should fail closed and remain usable:

- Reject malformed JSON/schema versions it does not understand.
- Never follow a navigation target that is not in the project.
- Never allow relative media paths to escape the scene directory.
- Show a placeholder for an unsupported component, missing image, missing media file, or unavailable
  data source rather than terminating the UI.
- Treat vehicle/control integrations as explicit pre-defined handlers; do not execute arbitrary scene-file code.
