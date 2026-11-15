import { z } from "zod";
import { isAssetType } from "../data/assets";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../types/scene";
import type { ElementType, Project } from "../types/scene";

export const MAX_ELEMENTS_PER_SCENE = 500;

const identifier = z.string().min(1).max(200);
const scalar = z.union([z.string().max(16_384), z.number(), z.boolean()]);
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
    transition: z.object({ type: z.string().min(1).max(100), durationMs: z.number().min(0).max(60_000) }).strict(),
  }).strict().optional(),
}).strict().superRefine((element, context) => {
  if (element.x + element.width > CANVAS_WIDTH || element.y + element.height > CANVAS_HEIGHT) {
    context.addIssue({ code: "custom", message: "Component extends beyond the supported screen" });
  }
});

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(100).refine((name) => name.trim().length > 0, "Project needs a name"),
  screen: z.object({ width: z.literal(CANVAS_WIDTH), height: z.literal(CANVAS_HEIGHT) }).strict(),
  startSceneId: identifier,
  scenes: z.array(z.object({
    id: identifier,
    name: z.string().min(1).max(100),
    elements: z.array(elementSchema).max(MAX_ELEMENTS_PER_SCENE),
  }).strict()).min(1).max(30),
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
  if (JSON.stringify(result.data).length > 2_000_000) throw new Error("Project exceeds the 2 MB document limit.");
  return result.data;
}

export function startingScene(project: Project) {
  // Validated project documents always have a valid startSceneId.
  return project.scenes.find((scene) => scene.id === project.startSceneId)!;
}

export function replaceStartingElements(project: Project, elements: Project["scenes"][number]["elements"]): Project {
  return { ...project, scenes: project.scenes.map((scene) => scene.id === project.startSceneId ? { ...scene, elements } : scene) };
}
