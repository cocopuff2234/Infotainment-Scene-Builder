# Infotainment Scene Builder

A visual workspace for designing in-car interfaces. Run `npm ci` and `npm run dev`, then open the local URL printed by Vite. The home page is at `/`, the editor at `/editor`, and account forms at `/login`.

## Designing a cockpit

- Click or drag grouped library assets onto the canvas: navigation maps, media players, rotary volume knobs, climate controls, action buttons, basic UI, vehicle data, information cards, phone, and custom placeholders.
- Select a component on the canvas or in the layers list. Drag to arrange with 8 px snapping; drag corner handles to scale proportionally or side handles to stretch width/height. Resizing stays within the canvas with a minimum size of 80 × 48 px, updates inspector dimensions on release, and creates one undoable change per gesture. Edit labels, positions, dimensions, and values in the inspector.
- Duplicate, delete, or move components forward/backward in the layer stack. Undo/redo retains up to 50 changes.
- Enter **Preview** to rotate the volume knob, adjust volume/temperature with ± controls, toggle playback, and enable drive mode. Preview changes are temporary: leaving preview restores the designed defaults without changing undo history or saved documents. These controls are visual simulations: the vector map is offline, and the media player does not play audio.
- The whole project saves automatically as a local recovery draft when browser storage is available. **Save cloud** explicitly saves to your account; **Open** manages cloud projects. Cloud autosave is not enabled yet. **Export JSON** downloads the same versioned project document (`schemaVersion`, `screen`, `startSceneId`, and `scenes`), including component properties, navigation actions, and designed volume/playback settings. There is no JSON import UI yet.
- Click the project name to rename it. **New** starts an unlinked local design. Up to 500 components per scene are supported.
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
- Cloud documents use schema version 1, the current 1000 × 620 screen, and runtime validation. Unsupported future versions/resolutions are rejected rather than silently rewritten. Multiple scenes are retained, but this editor currently edits only the starting scene.
- Saving sends the project document (including text, component props, and any embedded URLs) to your Supabase project. Cloud services require network access and are subject to your Supabase usage limits/billing. No live location, vehicle data, or uploads are transmitted by this implementation.

### Verification checklist

After applying the migration against a disposable/local Supabase database, run [`supabase/tests/projects_rls.sql`](supabase/tests/projects_rls.sql) as documented in its header. The rollback-only tests verify owner-only CRUD, cross-user/anonymous denial, immutable metadata, and stale-revision handling. Do not treat a frontend build as verification of deployed RLS.

Manually verify signup/confirmation, sign-in/out, password-reset links, cloud Save/Open/Delete, stale saves from two sessions, and guest editing with environment variables removed. No hosted Supabase project is provisioned or migrated by this repository change.

## Development

- `npm run build`: TypeScript check and production bundle.
- `npm run lint`: Oxlint.
- `npm test`: Type-checked Node tests for project validation, recovery, legacy migration, and local draft conflicts.

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
