import assert from "node:assert/strict";
import { test } from "node:test";
import { DRAFT_KEY, LEGACY_DRAFT_KEY, INVALID_DRAFT_BACKUP_KEY, createStarterProject, loadLocalDraft, LocalDraftConflictError, saveLocalDraft } from "./localDraft";

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test("new projects do not share mutable starter elements", () => {
  const first = createStarterProject();
  first.scenes[0].elements[0].text = "Changed";
  assert.notEqual(createStarterProject().scenes[0].elements[0].text, "Changed");
});

test("save and reopen the whole project document without cloud credentials or linkage", () => {
  const storage = memoryStorage();
  const project = createStarterProject();
  project.name = "Weekend drive";
  saveLocalDraft(project, storage);
  assert.deepEqual(loadLocalDraft(storage), { project, warning: null, writable: true, baseValue: storage.getItem(DRAFT_KEY) });
  const stored: unknown = JSON.parse(storage.getItem(DRAFT_KEY)!);
  assert.deepEqual(stored, project);
  assert.equal(storage.getItem("access_token"), null);
});

test("migrate old element-array drafts without deleting the original", () => {
  const storage = memoryStorage();
  const elements = createStarterProject().scenes[0].elements;
  elements[0].text = "Recovered route";
  const original = JSON.stringify(elements);
  storage.setItem(LEGACY_DRAFT_KEY, original);
  const recovered = loadLocalDraft(storage);
  assert.equal(recovered.project.scenes[0].elements[0].text, "Recovered route");
  assert.ok(recovered.warning?.includes("Recovered"));
  assert.equal(storage.getItem(LEGACY_DRAFT_KEY), original);
});

test("invalid drafts are backed up verbatim before automatic writes are allowed", () => {
  const storage = memoryStorage();
  storage.setItem(DRAFT_KEY, "unreadable data");
  const recovered = loadLocalDraft(storage);
  assert.equal(storage.getItem(INVALID_DRAFT_BACKUP_KEY), "unreadable data");
  assert.equal(storage.getItem(DRAFT_KEY), "unreadable data");
  assert.equal(recovered.writable, true);
  assert.ok(recovered.warning);
});

test("a different existing backup is never overwritten", () => {
  const storage = memoryStorage();
  storage.setItem(DRAFT_KEY, "new unreadable data");
  storage.setItem(INVALID_DRAFT_BACKUP_KEY, "earlier unreadable data");
  const recovered = loadLocalDraft(storage);
  assert.equal(recovered.writable, false);
  assert.equal(storage.getItem(DRAFT_KEY), "new unreadable data");
  assert.equal(storage.getItem(INVALID_DRAFT_BACKUP_KEY), "earlier unreadable data");
});

test("a stale tab cannot overwrite a newer local recovery draft", () => {
  const storage = memoryStorage();
  const baseline = saveLocalDraft(createStarterProject(), storage);
  const newer = createStarterProject();
  newer.name = "New work in tab B";
  saveLocalDraft(newer, storage, baseline);
  const stale = createStarterProject();
  stale.name = "Stale work in tab A";
  assert.throws(() => saveLocalDraft(stale, storage, baseline), LocalDraftConflictError);
  assert.equal(loadLocalDraft(storage).project.name, newer.name);
});

test("identical documents from two tabs do not conflict", () => {
  const storage = memoryStorage();
  const project = createStarterProject();
  saveLocalDraft(project, storage, null);
  assert.doesNotThrow(() => saveLocalDraft(project, storage, null));
});

test("unavailable storage does not prevent guest editing", () => {
  const storage = { getItem: () => { throw new Error("Blocked"); }, setItem: () => { throw new Error("Blocked"); } };
  const recovered = loadLocalDraft(storage);
  assert.equal(recovered.writable, false);
  assert.equal(recovered.project.scenes[0].elements.length, 5);
  assert.throws(() => saveLocalDraft(recovered.project, storage), /Blocked/);
});

test("unsupported future documents remain backed up rather than being stripped", () => {
  const storage = memoryStorage();
  const original = JSON.stringify({ ...createStarterProject(), schemaVersion: 99, futureField: { important: true } });
  storage.setItem(DRAFT_KEY, original);
  assert.ok(loadLocalDraft(storage).warning);
  assert.equal(storage.getItem(INVALID_DRAFT_BACKUP_KEY), original);
});
