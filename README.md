# Infotainment Scene Builder

A visual workspace for designing in-car interfaces. Run `npm ci` and `npm run dev`, then open the local URL printed by Vite. The home page is at `/`, the editor at `/editor`, and account forms at `/login`.

## Designing a cockpit

- Click or drag grouped library assets onto the canvas: navigation maps, media players, rotary volume knobs, climate controls, action buttons, basic UI, vehicle data, information cards, phone, and custom placeholders.
- Select a component on the canvas or in the layers list. Drag to arrange with 8 px snapping; drag corner handles to scale proportionally or side handles to stretch width/height. Resizing stays within the canvas with a minimum size of 80 × 48 px, updates inspector dimensions on release, and creates one undoable change per gesture. Edit labels, positions, dimensions, and values in the inspector.
- Duplicate, delete, or move components forward/backward in the layer stack. Undo/redo retains up to 50 changes.
- Use the scene bar above the canvas to add, switch, rename, delete, and choose the project start scene. Each scene keeps its own components and background, while undo/redo continues to operate on the whole project document.
- Select a **Button** or **Empty** component and use **On press** in the inspector to assign **Navigate to scene**. Empty components are dashed overlays while editing and completely invisible in Preview, so they can turn any visual region into a tappable action area. The underlying version-1 element type remains `hotspot` for compatibility. The action stores the target scene plus transition metadata in the exported JSON. Removing a target scene automatically clears links that would otherwise become invalid.
- Select a **Map** to configure MVP runtime metadata: center latitude/longitude, zoom, current-location/follow behavior, pan/zoom permissions, and the map provider/style. Edit mode intentionally keeps the lightweight stylized Konva map. **Preview** overlays a real Leaflet/OpenStreetMap map for browser testing; the same exported settings map to Qt Location on the PySide6/QML Raspberry Pi runtime.
- Enter **Preview** to rotate the volume knob, adjust volume/temperature with ± controls, toggle playback, enable drive mode, follow scene-navigation buttons, and use the live map overlay. Preview changes are temporary: leaving preview restores the designed defaults without changing undo history or saved documents. Scene changes happen in-memory without a page reload; transition and map metadata are exported for the target runtime. Media playback and live GPS input remain simulations/placeholders.
- The whole project saves automatically as a local recovery draft when browser storage is available. **Save cloud** explicitly saves to your account; **Open** manages cloud projects. Cloud autosave is not enabled yet. **Export package** downloads a `.infotainment.zip` containing `project.json`, a package manifest, and asset/media placement instructions. **JSON** remains available for debugging, and **Import JSON** can reopen a previously exported project. The Pi-ready badge reports portability/network notes before transfer.
- Click the project name to rename it. **New** starts an unlinked local design. Up to 30 scenes and 500 components per scene are supported.
- **Restore starter scene** replaces the current layout after confirmation; this action can be undone.

### Scene navigation format

Buttons and invisible **Empty** overlays can link scenes without changing schema version 1. Empty overlays still export with `"type": "hotspot"` so existing version-1 files remain compatible. A navigation button is exported with an optional `action` object like this:

```json
{
  "id": "settings-button",
  "type": "button",
  "text": "Settings",
  "action": {
    "type": "navigate",
    "targetSceneId": "settings-scene",
    "transition": { "type": "fade", "durationMs": 180 }
  }
}
```

`targetSceneId` must match a scene in the same project. Supported runtime transitions are **Instant**, **Fade**, **Slide left**, and **Slide right**. The Raspberry Pi/runtime side can load `startSceneId`, render that scene, and replace the active scene when a pressed element has a `navigate` action. The browser preview follows the same target links without reloading the app; the device runtime owns the actual transition animation.

### Raspberry Pi / QML runtime profile

New and re-saved version-1 documents carry an explicit runtime profile:

```json
{
  "runtime": {
    "target": "pyside6-qml",
    "contractVersion": 1,
    "scaleMode": "fit",
    "elementOrder": "array-z-order",
    "assetBase": ".",
    "theme": "dark"
  }
}
```

Older version-1 documents without this field are normalized when opened, so existing local/cloud projects remain compatible. `fit` tells the Pi to preserve the fixed 1000 × 620 design aspect ratio, array order is the back-to-front QML z-order, relative assets resolve from the imported scene directory, and `theme` selects dark or warm off-white light mode. The top-bar Light/Dark control changes both the editor presentation and exported runtime preference. See [`docs/PI_RUNTIME_CONTRACT.md`](docs/PI_RUNTIME_CONTRACT.md) for the complete Scene Builder → PySide6/QML handoff.

### Map MVP format

New map components export lightweight runtime configuration in `props` while the editor continues to draw the existing stylized map:

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

Latitude/longitude and zoom are validated before save/export. Existing version-1 map elements that do not have these optional properties continue to load with editor defaults. Browser Preview lazily loads Leaflet 1.9.4 from jsDelivr and raster tiles from OpenStreetMap, so the real-map preview requires network access; edit mode and project editing do not. On the Pi, `tileProvider: "osm"` is intended to map to Qt Location's OSM plugin rather than Leaflet.

### Head-unit media references

Media components expose a **Head-unit media** section in the inspector. You can attach a local audio file for the current export session, which automatically sets a portable `mediaPath`, or type a path relative to the imported scene directory (for example `media/song.mp3`). The package exporter embeds attached files at that path; unattached references are listed by the Pi-ready report and manifest. Absolute paths, URL schemes, and parent-directory traversal are rejected so a project can be moved from a development computer to USB storage and then to the Pi without rewriting paths. The initial PySide6 runtime can resolve these references into Qt Multimedia.

**Custom Asset** also exposes a relative `assetFile` path (for example `assets/custom-widget.png`) plus an image attachment picker. It uses the same portability checks and package embedding rules, matching the project plan where custom asset files travel with the scene and are resolved by the head unit.

### Images and scene backgrounds

- Use **Upload image** above the component library to add a photo/logo as a selectable, draggable, resizable image component. Alternatively, add an **Image** placeholder and upload through its inspector. The inspector also supports replacement, removal, and **Contain / Cover / Stretch** fitting. Transparent uploads retain transparency.
- In the left panel, **Scene background** provides a native color picker and numeric **R / G / B** channels (0–255). Upload a background image, set its fit, and adjust the darkening slider for legibility. Removing the background image keeps its base color; **Restore default background** returns the original navy gradient.
- Uploads accept PNG, JPEG, and WebP files up to **10 MiB**. Files are checked and re-encoded locally, resized to at most 1600 pixels on the longest edge, and further compressed/downscaled to at most 350,000 data-URL characters per image. SVG/GIF uploads are not supported. Uploaded metadata is not retained in the re-encoded raster.
- Images are **embedded in the JSON document**, not stored in a Supabase Storage bucket or temporary blob URL. Guest editing works without network access; local recovery, explicit cloud saves, and exports retain image data and scene backgrounds. Saving to cloud therefore uploads the embedded image content as part of the project document. No new SQL migration or Storage configuration is needed for this implementation.
- The existing total project limit of 2,000,000 serialized characters still applies. Changes that exceed it are rejected before replacing the current project; use fewer/smaller images. Browser local-storage quota may be lower than the space needed alongside other site data—watch the local-save status and use cloud save/export if necessary.
- Image/background changes participate in undo/redo. Uploads can be canceled; switching projects, entering preview, navigating history, or explicitly removing/resetting the upload target invalidates pending uploads. Preview itself does not modify images/backgrounds.
- The additive version-1 document extension is optional `scenes[].background = { color, image?, fit?, overlay? }`; image components store data in `props.src`, `props.name`, and `props.fit`. Older documents without these fields remain supported. Older app builds may reject the new background field; update clients together. Legacy non-string image sources/unsupported scalar fit values are normalized to empty/contain placeholders, while unsafe string sources remain rejected.

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

## Supabase setup

The app works locally without Supabase. Account services replace the old mock login; existing mock localStorage identities are not real accounts and are ignored.

1. Create a Supabase project. In its SQL Editor, run [`supabase/migrations/202611150001_projects.sql`](supabase/migrations/202611150001_projects.sql). Alternatively, apply it through your normal Supabase CLI migration workflow. It creates private project documents, owner-only row-level security policies, and server-managed revision/timestamp fields. Do not disable RLS.
2. Copy [`supabase/env.example`](supabase/env.example) to `.env.local` in the project root (beside `package.json`) and set the values from your project's API settings. This is a Vite app: use `VITE_` variable names, not Next.js's `NEXT_PUBLIC_` prefix:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_BROWSER_KEY
   ```

   A legacy `VITE_SUPABASE_ANON_KEY` is also supported. Use a **publishable/anon** key only. Never use `service_role` or `sb_secret_` keys: all `VITE_` values are public in the built frontend. Recognizable privileged keys are rejected as a safety check, not as a substitute for correct secret handling. Environment files are gitignored.
3. In Supabase Authentication, enable the Email provider. Keep email confirmation enabled for production. Configure Site URL for your app and add these development redirect URLs (replace the port if Vite uses another one):
   - `http://localhost:5173/login`
   - `http://localhost:5173/login?mode=update`
4. Add the corresponding HTTPS production login/reset URLs to the redirect allowlist and configure production SMTP before relying on email delivery. Configure OAuth separately if you add it later; this implementation uses email/password only.
5. Restart `npm run dev` after changing environment values. Production deployments need the same public variables at **build time**, and `index.html` fallback routing for `/editor` and `/login`, including query strings and email callback fragments.
6. Sign up, confirm your email if required, then sign in. In the editor, use **Save cloud**. Open the manager to reload, save a copy, rename through the editor title, or delete projects.

### Saving, recovery, and privacy

- **Cloud saving is manual.** Local recovery and cloud status are shown separately. A successful save records only that document snapshot; edits made during the request remain unsaved.
- Updates/deletes check the expected revision atomically. A stale tab gets a conflict instead of silently overwriting cloud work. Save a copy, or refresh the list and explicitly open the newer project. There is no live collaboration or durable version-history UI yet.
- Reloaded recovery drafts are deliberately **unlinked** from cloud project IDs. Their first cloud save creates a new copy. To update a previous project after reloading, first open it from the cloud list. This avoids stale account/revision linkage.
- Local recovery is one browser-device draft, **not account-private storage**. Signing out keeps the design locally and clears its in-memory cloud linkage. On shared computers, export/save as appropriate and clear browser site data before leaving. Supabase's SDK separately manages the persisted auth session; passwords are never stored by the app.
- The local editor checks for another tab's changed recovery value before writing and pauses on a conflict. This is a best-effort localStorage guard, not atomic multi-tab collaboration. Export or save cloud if warned; avoid editing the same local draft in multiple tabs.
- Old `infotainment-scene-v2` element-array drafts are migrated without deleting the old entry. Unreadable project drafts are backed up verbatim before replacement; if that cannot be done safely, local recovery saving is paused instead.
- Cloud documents use schema version 1, the current 1000 × 620 screen, and runtime validation. Unsupported future versions/resolutions are rejected rather than silently rewritten. The editor can author and edit multiple scenes, choose the start scene, and create validated scene-navigation actions.
- Saving sends the project document (including text, component props, and any embedded URLs) to your Supabase project. Cloud services require network access and are subject to your Supabase usage limits/billing. Embedded uploaded images are included when saving a project to the cloud. No live location or vehicle data is transmitted by this implementation.

### Verification checklist

After applying the migration against a disposable/local Supabase database, run [`supabase/tests/projects_rls.sql`](supabase/tests/projects_rls.sql) as documented in its header. The rollback-only tests verify owner-only CRUD, cross-user/anonymous denial, immutable metadata, and stale-revision handling. Do not treat a frontend build as verification of deployed RLS.

Manually verify signup/confirmation, sign-in/out, password-reset links, cloud Save/Open/Delete, stale saves from two sessions, and guest editing with environment variables removed. No hosted Supabase project is provisioned or migrated by this repository change.

## Development

- `npm run build`: TypeScript check and production bundle.
- `npm run lint`: Oxlint.
- `npm test`: Type-checked Node tests for project validation, recovery, legacy migration, local draft conflicts, image geometry/processing, and image/background persistence.

Production hosting must serve `index.html` for `/editor` and `/login` routes. Use a Node release supported by the installed Vite/Supabase toolchain; a current Node LTS release is recommended.

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
