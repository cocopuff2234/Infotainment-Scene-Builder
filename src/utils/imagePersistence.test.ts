import assert from "node:assert/strict";
import { test } from "node:test";
import { createStarterProject, loadLocalDraft, saveLocalDraft } from "./localDraft";
import { parseProject, replaceStartingElements } from "./projectDocument";
import { MAX_IMAGE_SOURCE_LENGTH } from "./imageUpload";

const raster = "data:image/png;base64,AAAA";

function imageProject() {
  const project = createStarterProject();
  project.scenes[0].elements = [{
    id: "image-1", type: "image", x: 80, y: 160, width: 300, height: 200, text: "My image",
    props: { src: raster, name: "photo.png", fit: "contain" },
  }];
  project.scenes[0].background = { color: "#1234ab", image: raster, fit: "cover", overlay: 0.25 };
  return project;
}

test("embedded image and background survive document JSON and local draft round trips", () => {
  const project = imageProject();
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  saveLocalDraft(project, storage);
  assert.deepEqual(loadLocalDraft(storage).project, project);
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(project))), project);
});

test("older projects remain valid without a background or image data", () => {
  const project = createStarterProject();
  const parsed = parseProject(project);
  assert.equal(parsed.scenes[0].background, undefined);
  assert.deepEqual(parsed, project);
});

test("background metadata remains attached when editing component arrays", () => {
  const project = imageProject();
  assert.deepEqual(replaceStartingElements(project, []).scenes[0].background, project.scenes[0].background);
  assert.equal(project.scenes[0].elements.length, 1);
});

test("large raster sources are allowed only in image src and background image fields", () => {
  const source = "data:image/webp;base64," + "A".repeat(20_000);
  const project = imageProject();
  project.scenes[0].elements[0].props!.src = source;
  project.scenes[0].background!.image = source;
  assert.equal(parseProject(project).scenes[0].elements[0].props!.src, source);
  project.scenes[0].elements[0].props!.name = "A".repeat(20_000);
  assert.throws(() => parseProject(project), /property exceeds/);
  delete project.scenes[0].elements[0].props!.name;
  project.scenes[0].elements[0].type = "custom";
  assert.throws(() => parseProject(project), /property exceeds/);
});

test("invalid colors, fit, opacity, and unsafe sources are rejected", () => {
  for (const background of [
    { color: "red" }, { color: "#fff" }, { color: "#123456", overlay: -0.1 },
    { color: "#123456", overlay: 1 }, { color: "#123456", fit: "tile" },
    { color: "#123456", image: "javascript:alert(1)" },
    { color: "#123456", image: "data:image/svg+xml;base64,AAAA" },
    { color: "#123456", image: "blob:temporary-reference" },
  ]) {
    const project = imageProject();
    assert.throws(() => parseProject({ ...project, scenes: [{ ...project.scenes[0], background }] }));
  }
  for (const src of ["data:image/svg+xml;base64,AAAA", "javascript:alert(1)", "data:image/png;base64," + "A".repeat(MAX_IMAGE_SOURCE_LENGTH)]) {
    const project = imageProject();
    project.scenes[0].elements[0].props!.src = src;
    assert.throws(() => parseProject(project));
  }
});

test("legacy placeholder scalar props are normalized without losing the project", () => {
  const project = imageProject();
  project.scenes[0].elements[0].props = { src: false, fit: "fill", note: "Keep this metadata" };
  const parsed = parseProject(project);
  assert.deepEqual(parsed.scenes[0].elements[0].props, { src: "", fit: "contain", note: "Keep this metadata" });
  assert.deepEqual(parsed.scenes[0].background, project.scenes[0].background);
  assert.equal(project.scenes[0].elements[0].props.src, false);
});

test("total document limit still protects persistence with multiple embedded images", () => {
  const project = imageProject();
  project.scenes[0].elements = Array.from({ length: 6 }, (_, index) => ({
    ...project.scenes[0].elements[0], id: `image-${index}`,
    props: { src: "data:image/webp;base64," + "A".repeat(340_000), fit: "contain" },
  }));
  assert.throws(() => parseProject(project), /2 MB document limit/);
});
