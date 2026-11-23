import { useState } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types/scene";
import type { Scene, SceneElement } from "../types/scene";
import type { UploadedImage } from "../utils/imageUpload";
import { ImageUpload } from "./ImageUpload";

type PropertiesPanelProps = {
  selectedElement: SceneElement | undefined;
  onUpdate: (id: string, patch: Partial<SceneElement>) => void;
  onReplaceImage: (id: string, image: UploadedImage) => void | Promise<void>;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (direction: number) => void;
  scenes: Scene[];
  currentSceneId: string;
  preview: boolean;
};

export function PropertiesPanel({ selectedElement: element, onUpdate, onReplaceImage, onDuplicate, onDelete, onReorder, scenes, currentSceneId, preview }: PropertiesPanelProps) {
  const [imageUploadEpoch, setImageUploadEpoch] = useState(0);
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
      {preview ? <div className="editor-preview-info"><span aria-hidden="true">▷</span><h3>Take it for a spin.</h3><p>Try controls and follow any scene-navigation buttons to test the full UI flow.</p><p>These are visual simulations, not connected vehicle controls or audio playback.</p><small>Leave preview to continue designing.</small></div> : element ? (
        <div className="properties-content">
          <div className="selected-preview"><span className="preview-dot" /><div><strong>{element.text || "Untitled component"}</strong><small>{element.type} component</small></div></div>
          <label>Label<input value={element.text} maxLength={60} onChange={(event) => onUpdate(element.id, { text: event.target.value })} /></label>
          <div className="editor-property-section"><h3>Position & size <span>PX</span></h3><div className="property-grid">{numericField("x", "X position")}{numericField("y", "Y position")}{numericField("width", "Width")}{numericField("height", "Height")}</div></div>
          {(element.type === "volume" || element.type === "climate") && <div className="editor-property-section"><h3>{element.type === "volume" ? "Volume level" : "Temperature"}<span>{element.value ?? (element.type === "volume" ? 65 : 21)}{element.type === "volume" ? "%" : "°C"}</span></h3><label className="editor-range-label"><span className="sr-only">{element.type === "volume" ? "Volume" : "Temperature"}</span><input type="range" min={element.type === "volume" ? 0 : 16} max={element.type === "volume" ? 100 : 30} step={element.type === "volume" ? 1 : 0.5} value={element.value ?? (element.type === "volume" ? 65 : 21)} onChange={(event) => onUpdate(element.id, { value: event.target.valueAsNumber })} /></label></div>}
          {(element.type === "button" || element.type === "music") && <label className="editor-checkbox-label"><input type="checkbox" checked={element.active ?? false} onChange={(event) => onUpdate(element.id, { active: event.target.checked })} />{element.type === "music" ? "Playback active" : "Control enabled"}</label>}
          {(element.type === "button" || element.type === "hotspot") && (
            <div className="editor-property-section editor-action-section">
              <h3>On press <span>{element.action ? "NAVIGATE" : "NONE"}</span></h3>
              <label>Action
                <select value={element.action ? "navigate" : "none"} onChange={(event) => {
                  if (event.target.value === "none") {
                    onUpdate(element.id, { action: undefined });
                    return;
                  }
                  const target = scenes.find((scene) => scene.id !== currentSceneId);
                  if (target) onUpdate(element.id, { action: { type: "navigate", targetSceneId: target.id, transition: { type: "fade", durationMs: 180 } } });
                }}>
                  <option value="none">No action</option>
                  <option value="navigate" disabled={scenes.length < 2}>Navigate to scene</option>
                </select>
              </label>
              {element.action ? <>
                <label>Destination scene
                  <select value={element.action.targetSceneId} onChange={(event) => onUpdate(element.id, { action: { ...element.action!, targetSceneId: event.target.value } })}>
                    {scenes.map((scene) => <option key={scene.id} value={scene.id} disabled={scene.id === currentSceneId}>{scene.name}{scene.id === currentSceneId ? " (current)" : ""}</option>)}
                  </select>
                </label>
                <label>Transition
                  <select value={element.action.transition.type === "fade" ? "fade" : "instant"} onChange={(event) => onUpdate(element.id, { action: { ...element.action!, transition: event.target.value === "fade" ? { type: "fade", durationMs: element.action!.transition.durationMs || 180 } : { type: "instant", durationMs: 0 } } })}>
                    <option value="instant">Instant</option>
                    <option value="fade">Fade</option>
                  </select>
                </label>
                {element.action.transition.type === "fade" && <label>Fade duration (ms)<input type="number" min={0} max={5000} step={50} value={element.action.transition.durationMs} onChange={(event) => {
                  if (event.target.value !== "" && Number.isFinite(event.target.valueAsNumber)) onUpdate(element.id, { action: { ...element.action!, transition: { type: "fade", durationMs: Math.max(0, Math.min(5000, event.target.valueAsNumber)) } } });
                }} /></label>}
                <p className="editor-action-note">Preview switches scenes immediately. Transition metadata is exported for the device runtime.</p>
              </> : <p className="editor-action-note">{scenes.length < 2 ? "Add another scene before assigning navigation." : "Choose Navigate to scene to turn this area into a screen link."}</p>}
            </div>
          )}
          {element.type === "image" && (
            <div className="editor-property-section image-properties">
              <h3>Image</h3>
              <ImageUpload key={`${element.id}-${imageUploadEpoch}`} compact label={element.props?.src ? "Replace image" : "Upload image"} disabled={preview} onUpload={(image) => onReplaceImage(element.id, image)} />
              <p className="image-properties-filename">{element.props?.src ? (typeof element.props.name === "string" && element.props.name ? element.props.name : "Current image") : "No image · placeholder shown"}</p>
              <label>Image fit
                <select value={element.props?.fit === "cover" || element.props?.fit === "stretch" ? element.props.fit : "contain"} onChange={(event) => onUpdate(element.id, { props: { ...element.props, fit: event.target.value } })}>
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="stretch">Stretch</option>
                </select>
              </label>
              <button type="button" className="secondary-button" disabled={!element.props?.src || preview} onClick={() => { setImageUploadEpoch((value) => value + 1); onUpdate(element.id, { props: { ...element.props, src: "", name: "" } }); }}>Remove image</button>
            </div>
          )}
          {element.type === "map" && <p className="editor-map-note">◇ Offline vector map. Edit the label to change the destination street. No API key needed.</p>}
          <div className="editor-property-section"><h3>Arrange</h3><div className="editor-arrange"><button className="secondary-button" onClick={() => onReorder(-1)}>↓ Backward</button><button className="secondary-button" onClick={() => onReorder(1)}>↑ Forward</button></div></div>
          <div className="editor-element-actions"><button className="secondary-button" onClick={onDuplicate}>⧉ Duplicate</button><button className="editor-delete-button" onClick={onDelete}>Delete</button></div>
          <div className="editor-shortcuts"><p>THE LITTLE SHORTCUTS</p><div><span>Nudge element</span><kbd>↑ ↓ ← →</kbd></div><div><span>Move by 8 px</span><kbd>Shift + ↑</kbd></div><div><span>Duplicate</span><kbd>⌘/Ctrl D</kbd></div><div><span>Undo</span><kbd>⌘/Ctrl Z</kbd></div><div><span>Delete</span><kbd>⌫</kbd></div></div>
        </div>
      ) : <div className="editor-preview-info"><span aria-hidden="true">⌖</span><h3>A place for every detail.</h3><p>Select a component on the canvas or in the layers list to adjust its label, position, and size.</p></div>}
    </aside>
  );
}
