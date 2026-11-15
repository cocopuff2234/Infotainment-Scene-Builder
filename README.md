# Infotainment Scene Builder

A visual workspace for designing in-car interfaces. Run `npm ci` and `npm run dev`, then open the local URL printed by Vite. The home page is at `/`, the editor at `/editor`, and account forms at `/login`.

## Designing a cockpit

- Click or drag grouped library assets onto the canvas: navigation maps, media players, rotary volume knobs, climate controls, action buttons, basic UI, vehicle data, information cards, phone, and custom placeholders.
- Select a component on the canvas or in the layers list. Drag to arrange with 8 px snapping; drag corner handles to scale proportionally or side handles to stretch width/height. Resizing stays within the canvas with a minimum size of 80 × 48 px, updates inspector dimensions on release, and creates one undoable change per gesture. Edit labels, positions, dimensions, and values in the inspector.
- Duplicate, delete, or move components forward/backward in the layer stack. Undo/redo retains up to 50 changes.
- Enter **Preview** to rotate the volume knob, adjust volume/temperature with ± controls, toggle playback, and enable drive mode. These controls are visual simulations: the vector map is offline, and the media player does not play audio.
- Scenes save automatically in this browser's local storage when available. **Export JSON** downloads the versioned project schema (`schemaVersion`, `screen`, `startSceneId`, and `scenes`), including component properties, navigation actions, and volume/playback settings. This replaces the earlier flat `elements` export format. There is no JSON import or cloud scene synchronization yet.
- **Restore starter scene** replaces the current layout after confirmation; this action can be undone.

### Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Undo | ⌘/Ctrl Z |
| Redo | ⌘/Ctrl Shift Z |
| Duplicate selection | ⌘/Ctrl D |
| Delete selection | Delete / Backspace |
| Nudge selection | Arrow keys |
| Nudge by 8 px | Shift + Arrow keys |
| Exit preview / deselect | Escape |

## Development

`npm run build` checks TypeScript and produces the production bundle. `npm run lint` runs Oxlint. Production hosting must serve `index.html` for `/editor` and `/login` routes.

## Template notes: React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
