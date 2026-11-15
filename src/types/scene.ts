export type ElementType = "button" | "map" | "volume" | "music" | "climate";

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
};

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 620;

export const componentDefaults: Record<ElementType, { text: string; width: number; height: number; value?: number }> = {
  map: { text: "Market Street", width: 540, height: 330 },
  music: { text: "Along the way", width: 340, height: 210 },
  volume: { text: "Master volume", width: 200, height: 170, value: 65 },
  climate: { text: "Cabin climate", width: 340, height: 96, value: 21 },
  button: { text: "Drive mode", width: 210, height: 64 },
};
