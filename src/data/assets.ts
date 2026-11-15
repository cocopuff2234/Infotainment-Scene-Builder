import type { AssetType, PropValue } from "../types/scene";

export const ASSET_GROUPS = [
  "Basic UI",
  "Controls",
  "Media",
  "Navigation",
  "Vehicle data",
  "Info",
  "Comfort & phone",
  "Custom",
] as const;

export type AssetGroup = (typeof ASSET_GROUPS)[number];

// How the editor draws the asset on the canvas.
export type PreviewKind =
  | "button"
  | "text"
  | "panel"
  | "icon"
  | "placeholder"
  | "slider"
  | "toggle"
  | "card";

export type AssetDefinition = {
  type: AssetType;
  label: string;
  description: string;
  group: AssetGroup;
  icon: string;
  preview: PreviewKind;
  // Defaults for a newly placed element
  width: number;
  height: number;
  text: string;
  props?: Record<string, PropValue>;
};

export const GROUP_ACCENT: Record<AssetGroup, string> = {
  "Basic UI": "#60a5fa",
  Controls: "#a78bfa",
  Media: "#f472b6",
  Navigation: "#34d399",
  "Vehicle data": "#fbbf24",
  Info: "#38bdf8",
  "Comfort & phone": "#fb923c",
  Custom: "#94a3b8",
};

// For data-bound assets, `text` is only a sample shown in the editor.
// On the head unit it is replaced with the live value named by
// props.source (e.g. "vehicle.speed").
export const ASSETS: AssetDefinition[] = [
  // ---- Basic UI ----
  {
    type: "button",
    label: "Button",
    description: "Interactive control",
    group: "Basic UI",
    icon: "+",
    preview: "button",
    width: 180,
    height: 64,
    text: "New Button",
  },
  {
    type: "label",
    label: "Text Label",
    description: "Static text",
    group: "Basic UI",
    icon: "T",
    preview: "text",
    width: 200,
    height: 40,
    text: "Label",
    props: { fontSize: 24 },
  },
  {
    type: "image",
    label: "Image",
    description: "Picture or logo",
    group: "Basic UI",
    icon: "🖼️",
    preview: "placeholder",
    width: 200,
    height: 140,
    text: "Image",
    props: { src: "" },
  },
  {
    type: "icon",
    label: "Icon",
    description: "Symbol or glyph",
    group: "Basic UI",
    icon: "★",
    preview: "icon",
    width: 64,
    height: 64,
    text: "★",
  },
  {
    type: "panel",
    label: "Panel",
    description: "Background container",
    group: "Basic UI",
    icon: "▭",
    preview: "panel",
    width: 300,
    height: 200,
    text: "",
  },

  // ---- Controls ----
  {
    type: "slider",
    label: "Slider",
    description: "Volume, brightness",
    group: "Controls",
    icon: "⎯●",
    preview: "slider",
    width: 260,
    height: 48,
    text: "Volume",
    props: { min: 0, max: 100, value: 50 },
  },
  {
    type: "toggle",
    label: "Toggle",
    description: "On / off switch",
    group: "Controls",
    icon: "◐",
    preview: "toggle",
    width: 200,
    height: 48,
    text: "Setting",
    props: { value: false },
  },

  // ---- Media ----
  {
    type: "music-player",
    label: "Music Player",
    description: "Play, pause, skip",
    group: "Media",
    icon: "🎵",
    preview: "card",
    width: 320,
    height: 160,
    text: "Song Title",
    props: { source: "media.player" },
  },
  {
    type: "now-playing",
    label: "Now Playing",
    description: "Track and artist",
    group: "Media",
    icon: "♪",
    preview: "card",
    width: 320,
    height: 100,
    text: "Song Title",
    props: { source: "media.nowPlaying" },
  },

  // ---- Navigation ----
  {
    type: "map",
    label: "Map",
    description: "Navigation map",
    group: "Navigation",
    icon: "🗺️",
    preview: "card",
    width: 360,
    height: 240,
    text: "Map",
    props: { source: "gps.location", zoom: 14 },
  },
  {
    type: "trip-info",
    label: "Trip / ETA",
    description: "Time to destination",
    group: "Navigation",
    icon: "🧭",
    preview: "card",
    width: 220,
    height: 100,
    text: "12 min",
    props: { source: "nav.eta" },
  },

  // ---- Vehicle data ----
  {
    type: "speedometer",
    label: "Speed",
    description: "Current speed",
    group: "Vehicle data",
    icon: "⏱️",
    preview: "card",
    width: 180,
    height: 110,
    text: "65 mph",
    props: { source: "vehicle.speed", unit: "mph" },
  },
  {
    type: "temperature",
    label: "Temperature",
    description: "Outside or cabin",
    group: "Vehicle data",
    icon: "🌡️",
    preview: "card",
    width: 180,
    height: 110,
    text: "72°F",
    props: { source: "vehicle.temperature", unit: "F" },
  },
  {
    type: "tire-pressure",
    label: "Tire Pressure",
    description: "Pressure per tire",
    group: "Vehicle data",
    icon: "🛞",
    preview: "card",
    width: 180,
    height: 110,
    text: "35 PSI",
    props: { source: "vehicle.tirePressure", unit: "psi" },
  },
  {
    type: "engine-status",
    label: "Engine",
    description: "Status and warnings",
    group: "Vehicle data",
    icon: "⚙️",
    preview: "card",
    width: 180,
    height: 110,
    text: "OK",
    props: { source: "vehicle.engineStatus" },
  },
  {
    type: "fuel-level",
    label: "Fuel / Battery",
    description: "Remaining charge",
    group: "Vehicle data",
    icon: "⛽",
    preview: "card",
    width: 180,
    height: 110,
    text: "70%",
    props: { source: "vehicle.fuelLevel", unit: "%" },
  },

  // ---- Info ----
  {
    type: "clock",
    label: "Clock",
    description: "Current time",
    group: "Info",
    icon: "🕒",
    preview: "card",
    width: 180,
    height: 100,
    text: "12:30",
    props: { source: "system.time", format: "12h" },
  },
  {
    type: "weather",
    label: "Weather",
    description: "Conditions and temp",
    group: "Info",
    icon: "☀️",
    preview: "card",
    width: 220,
    height: 110,
    text: "Sunny 68°F",
    props: { source: "weather.current", unit: "F" },
  },
  {
    type: "todo",
    label: "To-do List",
    description: "Short task list",
    group: "Info",
    icon: "✅",
    preview: "card",
    width: 240,
    height: 140,
    text: "• Buy groceries\n• Call Alex",
  },

  // ---- Comfort & phone ----
  {
    type: "climate",
    label: "Climate",
    description: "Temperature, fan",
    group: "Comfort & phone",
    icon: "❄️",
    preview: "card",
    width: 240,
    height: 120,
    text: "72°F · Auto",
    props: { source: "climate.state" },
  },
  {
    type: "phone",
    label: "Phone",
    description: "Calls and status",
    group: "Comfort & phone",
    icon: "📞",
    preview: "card",
    width: 240,
    height: 120,
    text: "Connected",
    props: { source: "phone.status" },
  },

  // ---- Custom ----
  {
    type: "custom",
    label: "Custom Asset",
    description: "Replaced on the device",
    group: "Custom",
    icon: "🧩",
    preview: "placeholder",
    width: 200,
    height: 140,
    text: "Custom",
    props: { assetFile: "" },
  },
];

export const ASSET_BY_TYPE = Object.fromEntries(
  ASSETS.map((asset) => [asset.type, asset]),
) as Record<AssetType, AssetDefinition>;

export function isAssetType(value: string): value is AssetType {
  return Object.prototype.hasOwnProperty.call(ASSET_BY_TYPE, value);
}

// Drag-and-drop payload name used between the asset panel and the canvas.
export const ASSET_DRAG_MIME = "application/x-scene-asset";
