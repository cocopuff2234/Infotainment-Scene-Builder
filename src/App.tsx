import { useState } from "react";
import "./App.css";

import { TopBar } from "./components/TopBar";
import { AssetPanel } from "./components/AssetPanel";
import { SceneCanvas } from "./components/SceneCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";

import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./config/project";
import { ASSET_BY_TYPE } from "./data/assets";
import { initialSceneElements } from "./data/initialScene";
import type { AssetType, SceneElement } from "./types/scene";
import { buildProject, downloadProject } from "./utils/exportScene";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// "button-1", "map-3", ... The number is one more than the highest
// existing number for that type, so IDs never repeat.
function nextId(type: AssetType, elements: SceneElement[]) {
  const pattern = new RegExp(`^${type}-(\\d+)$`);

  const highest = elements.reduce((max, element) => {
    const match = pattern.exec(element.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${type}-${highest + 1}`;
}

function App() {
  const [elements, setElements] = useState<SceneElement[]>(
    initialSceneElements,
  );

  const [selectedId, setSelectedId] = useState("button-1");

  const selectedElement = elements.find(
    (element) => element.id === selectedId,
  );

  // Adds an asset to the scene. With a position (from drag-and-drop) the
  // element is centered on it; without one (a click) it cascades down and
  // to the right so new elements do not stack exactly.
  function addAsset(type: AssetType, dropX?: number, dropY?: number) {
    const asset = ASSET_BY_TYPE[type];
    const step = elements.length % 12;

    const x =
      dropX === undefined ? 60 + step * 24 : dropX - asset.width / 2;
    const y =
      dropY === undefined ? 60 + step * 24 : dropY - asset.height / 2;

    const newElement: SceneElement = {
      id: nextId(type, elements),
      type,
      x: clamp(x, 0, SCREEN_WIDTH - asset.width),
      y: clamp(y, 0, SCREEN_HEIGHT - asset.height),
      width: asset.width,
      height: asset.height,
      text: asset.text,
      ...(asset.props ? { props: { ...asset.props } } : {}),
    };

    setElements((currentElements) => [
      ...currentElements,
      newElement,
    ]);

    setSelectedId(newElement.id);
  }

  function updateElementPosition(
    id: string,
    x: number,
    y: number,
  ) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === id
          ? { ...element, x, y }
          : element,
      ),
    );
  }

  function exportScene() {
    downloadProject(buildProject(elements));
  }

  return (
    <main className="app-shell">
      <TopBar onExport={exportScene} />

      <section className="workspace">
        <AssetPanel
          elementCount={elements.length}
          onAddAsset={addAsset}
        />

        <SceneCanvas
          elements={elements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={updateElementPosition}
          onDropAsset={addAsset}
        />

        <PropertiesPanel selectedElement={selectedElement} />
      </section>
    </main>
  );
}

export default App;
