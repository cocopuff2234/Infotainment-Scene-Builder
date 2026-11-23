import type { SceneElement } from "../types/scene";
import { MAP_DEFAULT_PROPS } from "./assets";

export const initialSceneElements: SceneElement[] = [
  { id: "map-1", type: "map", x: 32, y: 144, width: 540, height: 260, text: "Market Street", props: { ...MAP_DEFAULT_PROPS } },
  { id: "music-1", type: "music", x: 592, y: 144, width: 376, height: 210, text: "Along the way", active: false },
  { id: "climate-1", type: "climate", x: 592, y: 370, width: 376, height: 100, text: "Cabin climate", value: 21 },
  { id: "volume-1", type: "volume", x: 32, y: 416, width: 164, height: 140, text: "Master volume", value: 65 },
  { id: "button-1", type: "button", x: 256, y: 468, width: 220, height: 64, text: "Drive mode", active: false },
];
