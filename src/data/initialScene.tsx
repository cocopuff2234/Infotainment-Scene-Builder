import type { SceneElement } from "../types/scene";
import { MAP_DEFAULT_PROPS } from "./assets";

export const initialSceneElements: SceneElement[] = [
  { id: "map-1", type: "map", x: 32, y: 32, width: 540, height: 350, text: "Market Street", props: { ...MAP_DEFAULT_PROPS } },
  { id: "music-1", type: "music", x: 592, y: 32, width: 376, height: 210, text: "Along the way", active: false, props: { source: "media.player", mediaPath: "", artist: "", autoplay: false, loop: false } },
  { id: "climate-1", type: "climate", x: 592, y: 258, width: 376, height: 100, text: "Climate", value: 21 },
  { id: "volume-1", type: "volume", x: 32, y: 404, width: 180, height: 170, text: "Volume", value: 65 },
  { id: "button-1", type: "button", x: 256, y: 438, width: 220, height: 64, text: "Drive mode", active: false },
];
