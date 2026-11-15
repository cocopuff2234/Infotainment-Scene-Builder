import { initialSceneElements } from "../data/initialScene";
import type { Project } from "../types/scene";
import { buildProject } from "./exportScene";
import { parseProject } from "./projectDocument";

export const DRAFT_KEY = "infotainment-project-v1";
export const LEGACY_DRAFT_KEY = "infotainment-scene-v2";
export const INVALID_DRAFT_BACKUP_KEY = `${DRAFT_KEY}:unreadable-backup`;
type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export function createStarterProject(): Project {
  return { ...buildProject(structuredClone(initialSceneElements)), name: "My cockpit" };
}

export function loadLocalDraft(storage?: DraftStorage): { project: Project; warning: string | null; writable: boolean; baseValue: string | null } {
  let raw: string | null = null;
  try {
    const target = storage ?? window.localStorage;
    raw = target.getItem(DRAFT_KEY);
    if (raw !== null) {
      try {
        return { project: parseProject(JSON.parse(raw)), warning: null, writable: true, baseValue: raw };
      } catch {
        // Preserve an unreadable draft before any new automatic writes; never replace a previous backup.
        const existingBackup = target.getItem(INVALID_DRAFT_BACKUP_KEY);
        if (existingBackup !== null && existingBackup !== raw) {
          return { project: createStarterProject(), warning: "Your local draft could not be read. Local recovery saving is paused to preserve it; export your work before leaving.", writable: false, baseValue: raw };
        }
        target.setItem(INVALID_DRAFT_BACKUP_KEY, raw);
        return { project: createStarterProject(), warning: "An unreadable local draft was preserved in the browser under infotainment-project-v1:unreadable-backup. A starter project has been opened.", writable: true, baseValue: raw };
      }
    }
    const legacy = target.getItem(LEGACY_DRAFT_KEY);
    if (legacy !== null) {
      try {
        const elements: unknown = JSON.parse(legacy);
        const starter = createStarterProject();
        const candidate = { ...starter, scenes: [{ ...starter.scenes[0], elements }] };
        return { project: parseProject(candidate), warning: "Recovered your previous local scene. Save it to your account to keep a cloud copy.", writable: true, baseValue: raw };
      } catch {
        return { project: createStarterProject(), warning: "Your previous scene was not readable and has been left untouched in local storage.", writable: true, baseValue: raw };
      }
    }
    return { project: createStarterProject(), warning: null, writable: true, baseValue: raw };
  } catch {
    return { project: createStarterProject(), warning: "Local recovery storage is unavailable. Export your project or save to the cloud before leaving.", writable: false, baseValue: raw };
  }
}

export class LocalDraftConflictError extends Error {
  constructor() {
    super("Another tab changed the local recovery draft. This tab will not overwrite it. Export this design or save it to the cloud before leaving.");
    this.name = "LocalDraftConflictError";
  }
}

export function saveLocalDraft(project: Project, storage?: DraftStorage, expectedValue?: string | null): string {
  const target = storage ?? window.localStorage;
  const serialized = JSON.stringify(parseProject(project));
  const current = target.getItem(DRAFT_KEY);
  if (expectedValue !== undefined && current !== expectedValue && current !== serialized) throw new LocalDraftConflictError();
  target.setItem(DRAFT_KEY, serialized);
  return serialized;
}
