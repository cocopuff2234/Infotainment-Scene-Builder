// Project/runtime constants shared by the editor, validator, and exporter.
// The design surface remains fixed at 1000 x 620 for runtime contract 1.

export const SCHEMA_VERSION = 1 as const;
export const RUNTIME_CONTRACT_VERSION = 1 as const;
export const RUNTIME_TARGET = "pyside6-qml" as const;
export const RUNTIME_SCALE_MODE = "fit" as const;
export const RUNTIME_ELEMENT_ORDER = "array-z-order" as const;
export const RUNTIME_ASSET_BASE = "." as const;
export const SCENE_TRANSITION_TYPES = ["instant", "fade", "slide-left", "slide-right"] as const;

export const PROJECT_NAME = "Infotainment Scene";

export const SCREEN_WIDTH = 1000;
export const SCREEN_HEIGHT = 620;

export const SCENE_ID = "scene-1";
export const SCENE_NAME = "Home";
