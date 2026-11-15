// Every kind of element the editor can place. Each one has a matching
// entry in data/assets.ts and (later) a matching component on the Pi.
export type AssetType =
  // Basic UI
  | "button"
  | "label"
  | "image"
  | "icon"
  | "panel"
  // Controls
  | "slider"
  | "toggle"
  // Media
  | "music-player"
  | "now-playing"
  // Navigation
  | "map"
  | "trip-info"
  // Vehicle data
  | "speedometer"
  | "temperature"
  | "tire-pressure"
  | "engine-status"
  | "fuel-level"
  // Info
  | "clock"
  | "weather"
  | "todo"
  // Comfort and phone
  | "climate"
  | "phone"
  // Placeholder for a user-supplied asset
  | "custom";

export type PropValue = string | number | boolean;

export type SceneTransition = {
  type: string;
  durationMs: number;
};

// Scene connection. The editor has no UI for this yet; the type exists so
// the exported schema already has a place for it.
export type NavigateAction = {
  type: "navigate";
  targetSceneId: string;
  transition: SceneTransition;
};

export type SceneElement = {
  id: string;
  type: AssetType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  // Asset-specific settings, e.g. { source: "vehicle.speed", unit: "mph" }
  props?: Record<string, PropValue>;
  action?: NavigateAction;
};

export type Scene = {
  id: string;
  name: string;
  elements: SceneElement[];
};

// The exported scene file.
export type Project = {
  schemaVersion: 1;
  name: string;
  screen: { width: number; height: number };
  startSceneId: string;
  scenes: Scene[];
};
