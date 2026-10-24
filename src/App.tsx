import { useState } from "react";
import "./App.css";

import { TopBar } from "./components/TopBar";
import { AssetPanel } from "./components/AssetPanel";
import { SceneCanvas } from "./components/SceneCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";

import { initialSceneElements } from "./data/initialScene";
import type { SceneElement } from "./types/scene";

function App() {
  const [elements, setElements] = useState<SceneElement[]>(
    initialSceneElements,
  );

  const [selectedId, setSelectedId] = useState("button-1");

  const selectedElement = elements.find(
    (element) => element.id === selectedId,
  );

  function addButton() {
    const newButton: SceneElement = {
      id: `button-${elements.length + 1}`,
      type: "button",
      x: 80 + elements.length * 24,
      y: 80 + elements.length * 24,
      width: 180,
      height: 64,
      text: "New Button",
    };

    setElements((currentElements) => [
      ...currentElements,
      newButton,
    ]);

    setSelectedId(newButton.id);
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

  return (
    <main className="app-shell">
      <TopBar />

      <section className="workspace">
        <AssetPanel
          elementCount={elements.length}
          onAddButton={addButton}
        />

        <SceneCanvas
          elements={elements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={updateElementPosition}
        />

        <PropertiesPanel selectedElement={selectedElement} />
      </section>
    </main>
  );
}

export default App;
