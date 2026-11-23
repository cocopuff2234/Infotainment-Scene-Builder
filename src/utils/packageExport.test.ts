import assert from "node:assert/strict";
import { test } from "node:test";
import { createStarterProject } from "./localDraft";
import { buildProjectPackage, createStoredZip } from "./packageExport";
import { analyzeRuntimeCompatibility } from "./runtimeCompatibility";

test("Pi compatibility report lists portable runtime dependencies", () => {
  const project = createStarterProject();
  const music = project.scenes[0].elements.find((element) => element.type === "music")!;
  music.props = { ...music.props, mediaPath: "media/demo.mp3" };
  project.scenes[0].elements.push({
    id: "custom-file",
    type: "custom",
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    text: "Custom",
    props: { assetFile: "assets/demo.png" },
  });
  const report = analyzeRuntimeCompatibility(project);
  assert.equal(report.compatible, true);
  assert.deepEqual(report.requiredFiles, ["assets/demo.png", "media/demo.mp3"]);
  assert.ok(report.warnings.some((warning) => warning.includes("not attached")));
  assert.deepEqual(report.missingFiles, ["assets/demo.png", "media/demo.mp3"]);
});

test("package export is a readable ZIP-shaped artifact with project and manifest entries", () => {
  const bytes = buildProjectPackage(createStarterProject());
  assert.equal(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true), 0x04034b50);
  const raw = Buffer.from(bytes);
  assert.equal(raw.includes(Buffer.from("project.json")), true);
  assert.equal(raw.includes(Buffer.from("package-manifest.json")), true);
  assert.equal(raw.includes(Buffer.from("PACKAGE_README.txt")), true);
});

test("stored ZIP writer preserves UTF-8 filenames and file contents", () => {
  const bytes = createStoredZip({ "project.json": "{\"ok\":true}", "assets/readme.txt": "hello" });
  const raw = Buffer.from(bytes);
  assert.equal(raw.includes(Buffer.from("assets/readme.txt")), true);
  assert.equal(raw.includes(Buffer.from("hello")), true);
});


test("attached runtime files are embedded at their referenced package paths", () => {
  const project = createStarterProject();
  const music = project.scenes[0].elements.find((element) => element.type === "music")!;
  music.props = { ...music.props, mediaPath: "media/demo.mp3" };
  const bytes = buildProjectPackage(project, { "media/demo.mp3": new Uint8Array([1, 2, 3, 4]) });
  const raw = Buffer.from(bytes);
  assert.equal(raw.includes(Buffer.from("media/demo.mp3")), true);
  const report = analyzeRuntimeCompatibility(project, ["media/demo.mp3"]);
  assert.deepEqual(report.missingFiles, []);
});
