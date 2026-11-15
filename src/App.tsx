import { useCallback, useEffect, useState } from "react";
import "./App.css";
import "./Editor.css";
import { TopBar } from "./components/TopBar";
import { AssetPanel } from "./components/AssetPanel";
import { SceneCanvas } from "./components/SceneCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { initialSceneElements } from "./data/initialScene";
import { CANVAS_HEIGHT, CANVAS_WIDTH, componentDefaults } from "./types/scene";
import type { ElementType, SceneElement } from "./types/scene";

const STORAGE_KEY = "infotainment-scene-v2";
type History = { past: SceneElement[][]; present: SceneElement[]; future: SceneElement[][] };

function loadScene(): SceneElement[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(stored) && stored.every((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const e = item as Record<string, unknown>;
      return typeof e.id === "string" && typeof e.type === "string" && Object.hasOwn(componentDefaults, e.type)
        && typeof e.text === "string" && [e.x, e.y, e.width, e.height].every((v) => typeof v === "number" && Number.isFinite(v))
        && Number(e.width) > 0 && Number(e.height) > 0 && Number(e.x) >= 0 && Number(e.y) >= 0
        && Number(e.x) + Number(e.width) <= CANVAS_WIDTH && Number(e.y) + Number(e.height) <= CANVAS_HEIGHT
        && (e.value === undefined || (typeof e.value === "number" && Number.isFinite(e.value)))
        && (e.active === undefined || typeof e.active === "boolean");
    }) && new Set(stored.map((e: SceneElement) => e.id)).size === stored.length) return stored;
  } catch { /* An unavailable or invalid local draft should not prevent opening the editor. */ }
  return initialSceneElements;
}

function App() {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: loadScene(), future: [] }));
  const [selectedId, setSelectedId] = useState("map-1");
  const [preview, setPreview] = useState(false);
  const [saveResult, setSaveResult] = useState<{ scene: SceneElement[] | null; message: string }>({ scene: null, message: "" });
  const elements = history.present;
  const saveStatus = saveResult.scene === elements ? saveResult.message : "Saving locally…";
  const selectedElement = elements.find((element) => element.id === selectedId);

  const commit = useCallback((transform: (current: SceneElement[]) => SceneElement[]) => {
    setHistory((current) => {
      const next = transform(current.present);
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => setHistory((h) => h.past.length ? {
    past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future],
  } : h), []);
  const redo = useCallback(() => setHistory((h) => h.future.length ? {
    past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1),
  } : h), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
        setSaveResult({ scene: elements, message: "Saved on this device" });
      } catch { setSaveResult({ scene: elements, message: "Local saving unavailable" }); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [elements]);

  const updateElement = useCallback((id: string, patch: Partial<SceneElement>) => {
    commit((current) => current.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch, id: e.id, type: e.type };
      next.width = Math.max(80, Math.min(CANVAS_WIDTH, next.width));
      next.height = Math.max(48, Math.min(CANVAS_HEIGHT, next.height));
      next.x = Math.max(0, Math.min(CANVAS_WIDTH - next.width, next.x));
      next.y = Math.max(0, Math.min(CANVAS_HEIGHT - next.height, next.y));
      return next;
    }));
  }, [commit]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || preview) return;
    commit((current) => current.filter((e) => e.id !== selectedId));
    setSelectedId("");
  }, [commit, selectedId, preview]);

  const duplicateSelected = useCallback(() => {
    if (!selectedElement || preview) return;
    const copy = { ...selectedElement, id: crypto.randomUUID(), x: Math.min(CANVAS_WIDTH - selectedElement.width, selectedElement.x + 24), y: Math.min(CANVAS_HEIGHT - selectedElement.height, selectedElement.y + 24) };
    commit((current) => [...current, copy]);
    setSelectedId(copy.id);
  }, [commit, selectedElement, preview]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select, [contenteditable]"))) return;
      if (event.key === "Escape") { setPreview(false); setSelectedId(""); return; }
      if (preview) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (mod && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); }
      else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelected(); }
      else if (selectedElement && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 8 : 1;
        updateElement(selectedElement.id, { x: selectedElement.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: selectedElement.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [preview, selectedElement, updateElement, undo, redo, duplicateSelected, deleteSelected]);

  function addElement(type: ElementType) {
    const element: SceneElement = { ...componentDefaults[type], id: crypto.randomUUID(), type, x: 64 + (elements.length % 5) * 24, y: 152 + (elements.length % 5) * 24 };
    commit((current) => [...current, element]);
    setSelectedId(element.id);
  }

  function exportScene() {
    const data = { version: 1, name: "My cockpit", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, elements };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "infotainment-scene.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="app-shell">
      <TopBar saveStatus={saveStatus} preview={preview} onTogglePreview={() => setPreview((v) => !v)} onExport={exportScene} onUndo={undo} onRedo={redo} canUndo={history.past.length > 0 && !preview} canRedo={history.future.length > 0 && !preview} />
      <section className="workspace">
        <AssetPanel elements={elements} selectedId={selectedId} onSelect={setSelectedId} onAdd={addElement} preview={preview} onReset={() => { if (window.confirm("Replace this scene with the starter cockpit? You can undo this.")) { commit(() => initialSceneElements); setSelectedId("map-1"); } }} />
        <SceneCanvas elements={elements} selectedId={selectedId} onSelect={setSelectedId} onMove={(id, x, y) => updateElement(id, { x, y })} onUpdate={updateElement} preview={preview} />
        <PropertiesPanel selectedElement={selectedElement} onUpdate={updateElement} onDuplicate={duplicateSelected} onDelete={deleteSelected} onReorder={(direction) => {
          commit((current) => {
            const index = current.findIndex((e) => e.id === selectedId);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
            const next = [...current];
            [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
            return next;
          });
        }} preview={preview} />
      </section>
    </main>
  );
}

export default App;
