import { useState } from "react";
import type { SceneBackground } from "../types/scene";
import { ImageUpload } from "./ImageUpload";
import "./BackgroundSettings.css";

type Props = {
  background: SceneBackground | undefined;
  onChange: (background: SceneBackground | undefined) => boolean;
  disabled?: boolean;
};

const DEFAULT_COLOR = "#0b1628";

export function BackgroundSettings({ background, onChange, disabled = false }: Props) {
  const [uploadEpoch, setUploadEpoch] = useState(0);
  const color = background?.color ?? DEFAULT_COLOR;
  const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  const patch = (change: Partial<SceneBackground>) => onChange({ color, ...background, ...change });

  function changeChannel(index: number, value: number) {
    if (!Number.isFinite(value)) return;
    const channels = [...rgb];
    channels[index] = Math.max(0, Math.min(255, Math.round(value)));
    patch({ color: `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}` });
  }

  return (
    <section className="background-settings" aria-labelledby="background-title">
      <div className="panel-heading"><h3 id="background-title">Scene background</h3><span>◐</span></div>
      <p className="background-description">Set the mood with a color or your own image.</p>
      <fieldset disabled={disabled}>
        <div className="background-color-row"><label className="background-color-picker">Color<input type="color" value={color} aria-label="Background color" onChange={(event) => patch({ color: event.target.value })} /></label><span className="background-color-code">{background ? color.toUpperCase() : "DEFAULT THEME"}</span></div>
        <div className="background-rgb">{["R", "G", "B"].map((channel, index) => <label key={channel}>{channel}<input type="number" aria-label={`Background ${channel === "R" ? "red" : channel === "G" ? "green" : "blue"}`} min={0} max={255} step={1} value={rgb[index]} onChange={(event) => { if (event.target.value !== "") changeChannel(index, event.target.valueAsNumber); }} /></label>)}</div>
        <ImageUpload key={uploadEpoch} compact disabled={disabled} label={background?.image ? "Replace background" : "Upload background"} onUpload={(image) => {
          if (!patch({ image: image.src, fit: background?.fit ?? "cover", overlay: background?.overlay ?? 0.25 })) throw new Error("The background was not added. The project may be full; remove an image and try again.");
        }} />
        {background?.image && <>
          <label>Image fit<select value={background.fit ?? "cover"} onChange={(event) => patch({ fit: event.target.value as SceneBackground["fit"] })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="stretch">Stretch</option></select></label>
          <label className="background-overlay-label">Darken image <span>{Math.round((background.overlay ?? 0.25) * 100)}%</span><input type="range" min={0} max={85} step={1} value={Math.round((background.overlay ?? 0.25) * 100)} onChange={(event) => patch({ overlay: event.target.valueAsNumber / 100 })} /></label>
          <button type="button" className="editor-text-button" onClick={() => { setUploadEpoch((value) => value + 1); patch({ image: undefined }); }}>Remove background image</button>
        </>}
        <button type="button" className="background-reset" disabled={!background || disabled} onClick={() => { setUploadEpoch((value) => value + 1); onChange(undefined); }}>↻ Restore default background</button>
      </fieldset>
    </section>
  );
}
