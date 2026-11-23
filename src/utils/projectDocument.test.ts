import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSETS, ASSET_BY_TYPE } from "../data/assets";
import { createStarterProject } from "./localDraft";
import { parseProject, removeScene, replaceSceneElements, replaceStartingElements, startingScene } from "./projectDocument";

test("starter project validates without losing component states", () => {
  const document = createStarterProject();
  const volume = startingScene(document).elements.find((element) => element.type === "volume")!;
  volume.value = 0;
  volume.active = false;
  volume.props = { source: "media.volume", enabled: false, gain: 0 };
  assert.deepEqual(parseProject(document), document);
  assert.notEqual(parseProject(document), document);
});

test("all registered asset types can be saved and reopened", () => {
  for (const asset of ASSETS) {
    const document = createStarterProject();
    document.scenes[0].elements = [{ id: "component", type: asset.type, x: 0, y: 0, width: asset.width, height: asset.height, text: asset.text, ...(asset.props ? { props: asset.props } : {}) }];
    assert.equal(startingScene(parseProject(document)).elements[0].type, asset.type);
  }
});

test("map MVP defaults are persisted and Empty keeps the legacy hotspot type", () => {
  const map = ASSET_BY_TYPE.map;
  assert.equal(map.props?.tileProvider, "osm");
  assert.equal(map.props?.centerLat, 37.3382);
  assert.equal(map.props?.centerLng, -121.8863);
  assert.equal(map.props?.zoom, 14);
  assert.equal(ASSET_BY_TYPE.hotspot.label, "Empty");
  assert.equal(ASSET_BY_TYPE.hotspot.type, "hotspot");

  const document = createStarterProject();
  const starterMap = document.scenes[0].elements.find((element) => element.type === "map")!;
  assert.equal(starterMap.props?.tileProvider, "osm");
  assert.deepEqual(parseProject(document), document);
});

test("document edits preserve other scenes, metadata, and navigation actions", () => {
  const document = createStarterProject();
  document.scenes.push({ id: "second", name: "Second scene", elements: [] });
  document.scenes[0].elements[0].action = { type: "navigate", targetSceneId: "second", transition: { type: "fade", durationMs: 200 } };
  const updated = replaceStartingElements(document, document.scenes[0].elements.slice(0, 1));
  assert.equal(updated.scenes[1], document.scenes[1]);
  assert.equal(updated.name, document.name);
  assert.deepEqual(parseProject(updated).scenes[0].elements[0].action, document.scenes[0].elements[0].action);
  assert.equal(document.scenes[0].elements.length, 5);
});


test("scene helpers edit a selected scene and clean navigation links when a scene is removed", () => {
  const document = createStarterProject();
  document.scenes.push({ id: "second", name: "Second scene", elements: [{ id: "return", type: "button", x: 20, y: 20, width: 210, height: 64, text: "Return", action: { type: "navigate", targetSceneId: document.startSceneId, transition: { type: "fade", durationMs: 180 } } }] });
  document.scenes[0].elements[0].action = { type: "navigate", targetSceneId: "second", transition: { type: "fade", durationMs: 180 } };

  const edited = replaceSceneElements(document, "second", []);
  assert.equal(edited.scenes[0], document.scenes[0]);
  assert.equal(edited.scenes[1].elements.length, 0);

  const removed = removeScene(document, "second");
  assert.equal(removed.scenes.length, 1);
  assert.equal(removed.scenes[0].elements[0].action, undefined);
  assert.deepEqual(parseProject(removed), removed);
});

test("removing the starting scene promotes a remaining scene", () => {
  const document = createStarterProject();
  document.scenes.push({ id: "second", name: "Second scene", elements: [] });
  const removed = removeScene(document, document.startSceneId);
  assert.equal(removed.startSceneId, "second");
  assert.equal(startingScene(removed).id, "second");
});

test("unsupported schema versions and resolutions are rejected rather than silently rewritten", () => {
  assert.throws(() => parseProject({ ...createStarterProject(), schemaVersion: 2 }), /unsupported project/);
  assert.throws(() => parseProject({ ...createStarterProject(), screen: { width: 820, height: 560 } }), /unsupported project/);
  assert.throws(() => parseProject({ ...createStarterProject(), futureSetting: true }), /unsupported project/);
});

test("invalid IDs, geometry, component types, scalar props, and missing navigation targets are rejected", () => {
  const corruptions = [
    (document: ReturnType<typeof createStarterProject>) => { document.startSceneId = "missing"; },
    (document: ReturnType<typeof createStarterProject>) => { document.scenes.push(document.scenes[0]); },
    (document: ReturnType<typeof createStarterProject>) => { document.scenes[0].elements.push(document.scenes[0].elements[0]); },
    (document: ReturnType<typeof createStarterProject>) => { document.scenes[0].elements[0].x = 999; },
    (document: ReturnType<typeof createStarterProject>) => { document.scenes[0].elements[0].width = -1; },
    (document: ReturnType<typeof createStarterProject>) => { document.scenes[0].elements[0].value = Number.NaN; },
    (document: ReturnType<typeof createStarterProject>) => { document.scenes[0].elements[0].action = { type: "navigate", targetSceneId: "missing", transition: { type: "fade", durationMs: 100 } }; },
  ];
  for (const corrupt of corruptions) {
    const document = createStarterProject();
    corrupt(document);
    assert.throws(() => parseProject(document));
  }
  const document = createStarterProject();
  assert.throws(() => parseProject({ ...document, scenes: [{ ...document.scenes[0], elements: [{ ...document.scenes[0].elements[0], type: "unknown" }] }] }));
  assert.throws(() => parseProject({ ...document, scenes: [{ ...document.scenes[0], elements: [{ ...document.scenes[0].elements[0], props: { nested: { value: 5 } } }] }] }));
});

test("invalid map MVP runtime settings are rejected", () => {
  const corruptions: Array<Record<string, string | number | boolean>> = [
    { centerLat: 91 },
    { centerLng: -181 },
    { zoom: 14.5 },
    { zoom: 20 },
    { showCurrentLocation: "yes" },
    { followLocation: 1 },
    { allowPan: "true" },
    { allowZoom: 0 },
    { tileProvider: "unknown" },
    { mapStyle: "satellite" },
  ];
  for (const props of corruptions) {
    const document = createStarterProject();
    const map = document.scenes[0].elements.find((element) => element.type === "map")!;
    map.props = { ...map.props, ...props };
    assert.throws(() => parseProject(document));
  }
});
