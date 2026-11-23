import { z } from "zod";
import {
  RUNTIME_ASSET_BASE,
  RUNTIME_CONTRACT_VERSION,
  RUNTIME_ELEMENT_ORDER,
  RUNTIME_SCALE_MODE,
  RUNTIME_TARGET,
  SCENE_TRANSITION_TYPES,
} from "../config/project";
import { isAssetType } from "../data/assets";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types/scene";
import type { ElementType, Project } from "../types/scene";
import { isSafeImageSource, MAX_IMAGE_SOURCE_LENGTH } from "./imageUpload";

export const MAX_ELEMENTS_PER_SCENE = 500;
export const MAX_SCENES = 30;

const identifier = z.string().min(1).max(200);
const scalar = z.union([z.string().max(MAX_IMAGE_SOURCE_LENGTH), z.number(), z.boolean()]);
const relativeRuntimePath = z.string().max(512).refine((value) => {
  if (value === "") return true;
  if (value.includes("\\")) return false;
  if (value.startsWith("/") || value.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(value)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  return !value.replaceAll("\\", "/").split("/").includes("..");
}, "Runtime asset path must be relative to the imported scene package");
const imageSource = z.string().max(MAX_IMAGE_SOURCE_LENGTH).refine(isSafeImageSource, "Image source must be an embedded PNG, JPEG, WebP, or a valid HTTPS URL");
const runtimeSchema = z.object({
  target: z.literal(RUNTIME_TARGET),
  contractVersion: z.literal(RUNTIME_CONTRACT_VERSION),
  scaleMode: z.literal(RUNTIME_SCALE_MODE),
  elementOrder: z.literal(RUNTIME_ELEMENT_ORDER),
  assetBase: z.literal(RUNTIME_ASSET_BASE),
}).strict();
const backgroundSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Background color must be a six-digit hex color"),
  image: imageSource.optional(),
  fit: z.enum(["contain", "cover", "stretch"]).optional(),
  overlay: z.number().min(0).max(0.85).optional(),
}).strict();
const elementSchema = z.object({
  id: identifier,
  type: z.custom<ElementType>((value) => typeof value === "string" && isAssetType(value), "Unknown component type"),
  x: z.number().min(0).max(CANVAS_WIDTH),
  y: z.number().min(0).max(CANVAS_HEIGHT),
  width: z.number().positive().max(CANVAS_WIDTH),
  height: z.number().positive().max(CANVAS_HEIGHT),
  text: z.string().max(16_384),
  value: z.number().optional(),
  active: z.boolean().optional(),
  props: z.record(z.string().max(100), scalar).optional(),
  action: z.object({
    type: z.literal("navigate"),
    targetSceneId: identifier,
    transition: z.object({
      type: z.enum(SCENE_TRANSITION_TYPES),
      durationMs: z.number().min(0).max(5_000),
    }).strict(),
  }).strict().optional(),
}).strict().superRefine((element, context) => {
  for (const [key, value] of Object.entries(element.props ?? {})) {
    if (element.type === "image" && key === "src") {
      if (!imageSource.safeParse(value).success) context.addIssue({ code: "custom", message: "Image source is invalid or too large" });
    } else if (typeof value === "string" && value.length > 16_384) {
      context.addIssue({ code: "custom", message: "Component property exceeds the supported string limit" });
    }
  }
  if (element.type === "image" && element.props?.fit !== undefined && !["contain", "cover", "stretch"].includes(String(element.props.fit))) {
    context.addIssue({ code: "custom", message: "Unsupported image fit" });
  }
  if (element.type === "map") {
    const props = element.props ?? {};
    const validateMapNumber = (key: string, min: number, max: number, integer = false) => {
      const value = props[key];
      if (value === undefined) return;
      if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
        context.addIssue({ code: "custom", message: `Map ${key} is invalid` });
      }
    };
    validateMapNumber("centerLat", -90, 90);
    validateMapNumber("centerLng", -180, 180);
    validateMapNumber("zoom", 1, 19, true);
    for (const key of ["showCurrentLocation", "followLocation", "allowPan", "allowZoom"]) {
      if (props[key] !== undefined && typeof props[key] !== "boolean") context.addIssue({ code: "custom", message: `Map ${key} must be true or false` });
    }
    if (props.tileProvider !== undefined && props.tileProvider !== "osm") context.addIssue({ code: "custom", message: "Unsupported map tile provider" });
    if (props.mapStyle !== undefined && props.mapStyle !== "standard") context.addIssue({ code: "custom", message: "Unsupported map style" });
  }
  if (["music", "music-player", "now-playing"].includes(element.type)) {
    const mediaPath = element.props?.mediaPath;
    if (mediaPath !== undefined && (typeof mediaPath !== "string" || !relativeRuntimePath.safeParse(mediaPath).success)) {
      context.addIssue({ code: "custom", message: "Media path must be a relative scene-package path" });
    }
    const autoplay = element.props?.autoplay;
    const loop = element.props?.loop;
    if (autoplay !== undefined && typeof autoplay !== "boolean") context.addIssue({ code: "custom", message: "Media autoplay must be true or false" });
    if (loop !== undefined && typeof loop !== "boolean") context.addIssue({ code: "custom", message: "Media loop must be true or false" });
  }
  if (element.type === "custom") {
    const assetFile = element.props?.assetFile;
    if (assetFile !== undefined && (typeof assetFile !== "string" || !relativeRuntimePath.safeParse(assetFile).success)) {
      context.addIssue({ code: "custom", message: "Custom asset file must be a relative scene-package path" });
    }
  }
  if (element.action?.transition.type === "instant" && element.action.transition.durationMs !== 0) {
    context.addIssue({ code: "custom", message: "Instant transitions must have a zero millisecond duration" });
  }
  if (element.x + element.width > CANVAS_WIDTH || element.y + element.height > CANVAS_HEIGHT) {
    context.addIssue({ code: "custom", message: "Component extends beyond the supported screen" });
  }
});

const persistedElementSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const element = input as Record<string, unknown>;
  if (element.type !== "image" || !element.props || typeof element.props !== "object" || Array.isArray(element.props)) return input;
  const props = { ...element.props } as Record<string, unknown>;
  // Earlier v1 placeholders accepted arbitrary scalar props without interpreting them.
  if (typeof props.src === "boolean" || typeof props.src === "number") props.src = "";
  if ((typeof props.fit === "string" && props.fit.length <= 16_384) || typeof props.fit === "boolean" || typeof props.fit === "number") {
    if (!["contain", "cover", "stretch"].includes(String(props.fit))) props.fit = "contain";
  }
  return { ...element, props };
}, elementSchema);

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(100).refine((name) => name.trim().length > 0, "Project needs a name"),
  screen: z.object({ width: z.literal(CANVAS_WIDTH), height: z.literal(CANVAS_HEIGHT) }).strict(),
  // Added during the v1 lifetime. Older v1 documents are normalized to this
  // runtime profile by parseProject so existing drafts/cloud projects remain valid.
  runtime: runtimeSchema.optional(),
  startSceneId: identifier,
  scenes: z.array(z.object({
    id: identifier,
    name: z.string().min(1).max(100),
    elements: z.array(persistedElementSchema).max(MAX_ELEMENTS_PER_SCENE),
    background: backgroundSchema.optional(),
  }).strict()).min(1).max(MAX_SCENES),
}).strict().superRefine((project, context) => {
  const sceneIds = new Set(project.scenes.map((scene) => scene.id));
  if (sceneIds.size !== project.scenes.length) context.addIssue({ code: "custom", message: "Scene IDs must be unique" });
  if (!sceneIds.has(project.startSceneId)) context.addIssue({ code: "custom", message: "Starting scene does not exist" });
  for (const scene of project.scenes) {
    if (new Set(scene.elements.map((element) => element.id)).size !== scene.elements.length) {
      context.addIssue({ code: "custom", message: `Component IDs must be unique in ${scene.name}` });
    }
    for (const element of scene.elements) {
      if (element.action && !sceneIds.has(element.action.targetSceneId)) {
        context.addIssue({ code: "custom", message: "Navigation target scene does not exist" });
      }
    }
  }
});

/** Version 1 is the first persisted project format; reject future versions rather than dropping fields. */
export function parseProject(input: unknown): Project {
  const result = projectSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid or unsupported project: ${result.error.issues[0]?.message ?? "Invalid document"}. This editor supports schema version 1 and a ${CANVAS_WIDTH} × ${CANVAS_HEIGHT} screen.`);
  }
  if (JSON.stringify(result.data).length > 2_000_000) throw new Error("Project exceeds the 2 MB document limit. Remove an image or use a smaller one before adding more content.");
  return {
    ...result.data,
    runtime: result.data.runtime ?? {
      target: RUNTIME_TARGET,
      contractVersion: RUNTIME_CONTRACT_VERSION,
      scaleMode: RUNTIME_SCALE_MODE,
      elementOrder: RUNTIME_ELEMENT_ORDER,
      assetBase: RUNTIME_ASSET_BASE,
    },
  };
}

export function sceneById(project: Project, sceneId: string) {
  return project.scenes.find((scene) => scene.id === sceneId);
}

export function startingScene(project: Project) {
  // Validated project documents always have a valid startSceneId.
  return sceneById(project, project.startSceneId)!;
}

export function replaceSceneElements(project: Project, sceneId: string, elements: Project["scenes"][number]["elements"]): Project {
  if (!sceneById(project, sceneId)) throw new Error("Scene does not exist");
  return { ...project, scenes: project.scenes.map((scene) => scene.id === sceneId ? { ...scene, elements } : scene) };
}

export function replaceStartingElements(project: Project, elements: Project["scenes"][number]["elements"]): Project {
  return replaceSceneElements(project, project.startSceneId, elements);
}

export function removeScene(project: Project, sceneId: string): Project {
  if (project.scenes.length <= 1) throw new Error("A project needs at least one scene");
  if (!sceneById(project, sceneId)) throw new Error("Scene does not exist");
  const scenes = project.scenes
    .filter((scene) => scene.id !== sceneId)
    .map((scene) => ({
      ...scene,
      elements: scene.elements.map((element) => element.action?.targetSceneId === sceneId
        ? { ...element, action: undefined }
        : element),
    }));
  const startSceneId = project.startSceneId === sceneId ? scenes[0].id : project.startSceneId;
  return { ...project, startSceneId, scenes };
}
