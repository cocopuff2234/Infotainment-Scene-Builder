import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types/scene";
import type { SceneElement } from "../types/scene";

type PropertiesPanelProps = {
  selectedElement: SceneElement | undefined;
  onUpdate: (id: string, patch: Partial<SceneElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (direction: number) => void;
  preview: boolean;
};

export function PropertiesPanel({ selectedElement: element, onUpdate, onDuplicate, onDelete, onReorder, preview }: PropertiesPanelProps) {
  function numericField(key: "x" | "y" | "width" | "height", label: string) {
    if (!element) return null;
    const max = key === "width" ? CANVAS_WIDTH - element.x : key === "height" ? CANVAS_HEIGHT - element.y : key === "x" ? CANVAS_WIDTH - element.width : CANVAS_HEIGHT - element.height;
    return <label>{label}<input type="number" value={Math.round(element[key])} min={key === "width" ? 80 : key === "height" ? 48 : 0} max={max} onChange={(event) => {
      if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) onUpdate(element.id, { [key]: Math.min(max, event.target.valueAsNumber) });
    }} /></label>;
  }

  return (
    <aside className="panel properties-panel">
      <div className="panel-heading"><div><p className="eyebrow">Make it yours</p><h2>Inspector</h2></div><span className="editor-inspector-icon" aria-hidden="true">⌖</span></div>
      {preview ? <div className="editor-preview-info"><span aria-hidden="true">▷</span><h3>Take it for a spin.</h3><p>Try the volume and temperature controls, toggle playback, or switch drive mode on the display.</p><p>These are visual simulations, not connected vehicle controls or audio playback.</p><small>Leave preview to continue designing.</small></div> : element ? (
        <div className="properties-content">
          <div className="selected-preview"><span className="preview-dot" /><div><strong>{element.text || "Untitled component"}</strong><small>{element.type} component</small></div></div>
          <label>Label<input value={element.text} maxLength={60} onChange={(event) => onUpdate(element.id, { text: event.target.value })} /></label>
          <div className="editor-property-section"><h3>Position & size <span>PX</span></h3><div className="property-grid">{numericField("x", "X position")}{numericField("y", "Y position")}{numericField("width", "Width")}{numericField("height", "Height")}</div></div>
          {(element.type === "volume" || element.type === "climate") && <div className="editor-property-section"><h3>{element.type === "volume" ? "Volume level" : "Temperature"}<span>{element.value ?? (element.type === "volume" ? 65 : 21)}{element.type === "volume" ? "%" : "°C"}</span></h3><label className="editor-range-label"><span className="sr-only">{element.type === "volume" ? "Volume" : "Temperature"}</span><input type="range" min={element.type === "volume" ? 0 : 16} max={element.type === "volume" ? 100 : 30} step={element.type === "volume" ? 1 : 0.5} value={element.value ?? (element.type === "volume" ? 65 : 21)} onChange={(event) => onUpdate(element.id, { value: event.target.valueAsNumber })} /></label></div>}
          {(element.type === "button" || element.type === "music") && <label className="editor-checkbox-label"><input type="checkbox" checked={element.active ?? false} onChange={(event) => onUpdate(element.id, { active: event.target.checked })} />{element.type === "music" ? "Playback active" : "Control enabled"}</label>}
          {element.type === "map" && <p className="editor-map-note">◇ Offline vector map. Edit the label to change the destination street. No API key needed.</p>}
          <div className="editor-property-section"><h3>Arrange</h3><div className="editor-arrange"><button className="secondary-button" onClick={() => onReorder(-1)}>↓ Backward</button><button className="secondary-button" onClick={() => onReorder(1)}>↑ Forward</button></div></div>
          <div className="editor-element-actions"><button className="secondary-button" onClick={onDuplicate}>⧉ Duplicate</button><button className="editor-delete-button" onClick={onDelete}>Delete</button></div>
          <div className="editor-shortcuts"><p>THE LITTLE SHORTCUTS</p><div><span>Nudge element</span><kbd>↑ ↓ ← →</kbd></div><div><span>Move by 8 px</span><kbd>Shift + ↑</kbd></div><div><span>Duplicate</span><kbd>⌘/Ctrl D</kbd></div><div><span>Undo</span><kbd>⌘/Ctrl Z</kbd></div><div><span>Delete</span><kbd>⌫</kbd></div></div>
        </div>
      ) : <div className="editor-preview-info"><span aria-hidden="true">⌖</span><h3>A place for every detail.</h3><p>Select a component on the canvas or in the layers list to adjust its label, position, and size.</p></div>}
    </aside>
  );
}
