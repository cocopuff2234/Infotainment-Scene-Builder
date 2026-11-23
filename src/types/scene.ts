import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../config/project";

export type CockpitType = "button" | "map" | "volume" | "music" | "climate";
export type ElementType = CockpitType
  | "label" | "image" | "icon" | "panel" | "hotspot"
  | "slider" | "toggle"
  | "music-player" | "now-playing"
  | "trip-info" | "speedometer" | "temperature" | "tire-pressure"
  | "engine-status" | "fuel-level"
  | "clock" | "weather" | "todo" | "phone" | "custom";
export type AssetType = ElementType;
export type PropValue = string | number | boolean;

export type SceneTransition = { type: string; durationMs: number };
export type NavigateAction = {
  type: "navigate";
  targetSceneId: string;
  transition: SceneTransition;
};

export type SceneElement = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  value?: number;
  active?: boolean;
  props?: Record<string, PropValue>;
  action?: NavigateAction;
};

export type SceneBackground = {
  color: string;
  image?: string;
  fit?: "contain" | "cover" | "stretch";
  overlay?: number;
};

export type Scene = { id: string; name: string; elements: SceneElement[]; background?: SceneBackground };
export type Project = {
  schemaVersion: 1;
  name: string;
  screen: { width: number; height: number };
  startSceneId: string;
  scenes: Scene[];
};

export const CANVAS_WIDTH = SCREEN_WIDTH;
export const CANVAS_HEIGHT = SCREEN_HEIGHT;

export const componentDefaults: Record<CockpitType, { text: string; width: number; height: number; value?: number }> = {
  map: { text: "Market Street", width: 540, height: 330 },
  music: { text: "Along the way", width: 340, height: 210 },
  volume: { text: "Master volume", width: 200, height: 170, value: 65 },
  climate: { text: "Cabin climate", width: 340, height: 96, value: 21 },
  button: { text: "Drive mode", width: 210, height: 64 },
};

export function isCockpitType(type: ElementType): type is CockpitType {
  return Object.hasOwn(componentDefaults, type);
}
