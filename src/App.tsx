import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import "./Editor.css";
import { TopBar } from "./components/TopBar";
import { AssetPanel } from "./components/AssetPanel";
import { SceneCanvas } from "./components/SceneCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ProjectMenu } from "./components/ProjectMenu";
import { initialSceneElements } from "./data/initialScene";
import { CANVAS_HEIGHT, CANVAS_WIDTH, componentDefaults, isCockpitType } from "./types/scene";
import { ASSET_BY_TYPE } from "./data/assets";
import { downloadProject } from "./utils/exportScene";
import { MAX_ELEMENTS_PER_SCENE, parseProject, replaceStartingElements, startingScene } from "./utils/projectDocument";
import { createStarterProject, loadLocalDraft, LocalDraftConflictError, saveLocalDraft } from "./utils/localDraft";
import type { ElementType, Project, SceneElement } from "./types/scene";

type History = { past: Project[]; present: Project; future: Project[] };

function boundedElement(element: SceneElement, patch: Partial<SceneElement>): SceneElement {
  const next = { ...element, ...patch, id: element.id, type: element.type };
  next.width = Math.max(80, Math.min(CANVAS_WIDTH, next.width));
  next.height = Math.max(48, Math.min(CANVAS_HEIGHT, next.height));
  next.x = Math.max(0, Math.min(CANVAS_WIDTH - next.width, next.x));
  next.y = Math.max(0, Math.min(CANVAS_HEIGHT - next.height, next.y));
  return next;
}

function App() {
  const [recovery] = useState(() => loadLocalDraft());
  const [history, setHistory] = useState<History>(() => ({ past: [], present: recovery.project, future: [] }));
  const [selectedId, setSelectedId] = useState("map-1");
  const [previewElements, setPreviewElements] = useState<SceneElement[] | null>(null);
  const [warning, setWarning] = useState(recovery.warning);
  const [localSavingPaused, setLocalSavingPaused] = useState(false);
  const localBaseValue = useRef(recovery.baseValue);
  const lastLocallySavedProject = useRef<Project | null>(null);
  const localConflict = useRef(false);
  const [saveResult, setSaveResult] = useState<{ project: Project | null; message: string }>({ project: null, message: "" });
  const project = history.present;
  const designedElements = startingScene(project).elements;
  const preview = previewElements !== null;
  const elements = previewElements ?? designedElements;
  const saveStatus = !recovery.writable || localSavingPaused ? "Local recovery paused · export or save cloud" : saveResult.project === project ? saveResult.message : "Saving local draft…";
  const selectedElement = elements.find((element) => element.id === selectedId);

  const commitProject = useCallback((transform: (current: Project) => Project) => {
    setHistory((current) => {
      const next = transform(current.present);
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
  }, []);
  const commitElements = useCallback((transform: (current: SceneElement[]) => SceneElement[]) => {
    commitProject((current) => replaceStartingElements(current, transform(startingScene(current).elements)));
  }, [commitProject]);

  const undo = useCallback(() => setHistory((h) => h.past.length ? {
    past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future],
  } : h), []);
  const redo = useCallback(() => setHistory((h) => h.future.length ? {
    past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1),
  } : h), []);

  useEffect(() => {
    if (!recovery.writable) return;
    function persist() {
      if (localConflict.current || lastLocallySavedProject.current === project) return;
      try {
        localBaseValue.current = saveLocalDraft(project, undefined, localBaseValue.current);
        lastLocallySavedProject.current = project;
        setSaveResult({ project, message: "Draft saved on this device" });
      } catch (error) {
        if (error instanceof LocalDraftConflictError) {
          localConflict.current = true;
          setLocalSavingPaused(true);
          setWarning(error.message);
        }
        setSaveResult({ project, message: "Local save paused · export or save cloud" });
      }
    }
    const timer = window.setTimeout(persist, 350);
    const flush = () => { window.clearTimeout(timer); persist(); };
    window.addEventListener("pagehide", flush);
    return () => { window.clearTimeout(timer); window.removeEventListener("pagehide", flush); };
  }, [project, recovery.writable]);

  const updateElement = useCallback((id: string, patch: Partial<SceneElement>) => {
    const update = (current: SceneElement[]) => current.map((element) => element.id === id ? boundedElement(element, patch) : element);
    if (preview) setPreviewElements((current) => current ? update(current) : current);
    else commitElements(update);
  }, [commitElements, preview]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || preview) return;
    commitElements((current) => current.filter((element) => element.id !== selectedId));
    setSelectedId("");
  }, [commitElements, selectedId, preview]);

  const duplicateSelected = useCallback(() => {
    if (!selectedElement || preview || designedElements.length >= MAX_ELEMENTS_PER_SCENE) return;
    const copy = { ...structuredClone(selectedElement), id: crypto.randomUUID(), x: Math.min(CANVAS_WIDTH - selectedElement.width, selectedElement.x + 24), y: Math.min(CANVAS_HEIGHT - selectedElement.height, selectedElement.y + 24) };
    commitElements((current) => current.length < MAX_ELEMENTS_PER_SCENE ? [...current, copy] : current);
    setSelectedId(copy.id);
  }, [commitElements, selectedElement, preview, designedElements.length]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "Escape") { setPreviewElements(null); setSelectedId(""); return; }
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

  function addElement(type: ElementType, dropX?: number, dropY?: number) {
    if (preview || designedElements.length >= MAX_ELEMENTS_PER_SCENE) return;
    const asset = ASSET_BY_TYPE[type];
    const defaults = isCockpitType(type) ? componentDefaults[type] : asset;
    const width = Math.max(80, Math.min(CANVAS_WIDTH, defaults.width));
    const height = Math.max(48, Math.min(CANVAS_HEIGHT, defaults.height));
    const x = dropX === undefined ? 64 + (elements.length % 5) * 24 : dropX - width / 2;
    const y = dropY === undefined ? 152 + (elements.length % 5) * 24 : dropY - height / 2;
    const element: SceneElement = {
      text: defaults.text, width, height,
      ...(isCockpitType(type) ? componentDefaults[type] : {}),
      id: crypto.randomUUID(), type,
      x: Math.max(0, Math.min(CANVAS_WIDTH - width, x)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT - height, y)),
      ...(asset.props ? { props: { ...asset.props } } : {}),
    };
    commitElements((current) => current.length < MAX_ELEMENTS_PER_SCENE ? [...current, element] : current);
    setSelectedId(element.id);
  }

  function openProject(document: Project) {
    const validated = parseProject(document);
    setHistory({ past: [], present: validated, future: [] });
    setPreviewElements(null);
    setSelectedId("");
  }

  return (
    <main className="app-shell">
      <TopBar projectName={project.name} onRename={(name) => commitProject((current) => ({ ...current, name }))} projectActions={<ProjectMenu document={project} onOpen={openProject} onNew={() => openProject(createStarterProject())} />} saveStatus={saveStatus} preview={preview} onTogglePreview={() => setPreviewElements((current) => current ? null : structuredClone(designedElements))} onExport={() => downloadProject(parseProject(project))} onUndo={undo} onRedo={redo} canUndo={history.past.length > 0 && !preview} canRedo={history.future.length > 0 && !preview} />
      {designedElements.length >= MAX_ELEMENTS_PER_SCENE && <div className="editor-recovery-warning" role="status">This scene has reached the {MAX_ELEMENTS_PER_SCENE}-component limit. Remove a component before adding or duplicating another.</div>}
      {warning && <div className="editor-recovery-warning" role="status"><span>{warning}</span><button onClick={() => setWarning(null)} aria-label="Dismiss recovery notice">×</button></div>}
      <section className="workspace">
        <AssetPanel elements={elements} selectedId={selectedId} onSelect={setSelectedId} onAdd={addElement} preview={preview} onReset={() => { if (window.confirm("Replace this scene with the starter cockpit? You can undo this.")) { commitElements(() => structuredClone(initialSceneElements)); setSelectedId("map-1"); } }} />
        <SceneCanvas elements={elements} selectedId={selectedId} onSelect={setSelectedId} onMove={(id, x, y) => updateElement(id, { x, y })} onUpdate={updateElement} onDropAsset={addElement} preview={preview} />
        <PropertiesPanel selectedElement={selectedElement} onUpdate={updateElement} onDuplicate={duplicateSelected} onDelete={deleteSelected} onReorder={(direction) => {
          commitElements((current) => {
            const index = current.findIndex((element) => element.id === selectedId);
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
