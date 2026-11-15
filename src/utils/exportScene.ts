import {
  PROJECT_NAME,
  SCENE_ID,
  SCENE_NAME,
  SCHEMA_VERSION,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../config/project";
import type { Project, SceneElement } from "../types/scene";

function toExportedElement(element: SceneElement): SceneElement {
  return {
    id: element.id,
    type: element.type,
    // Dragging produces fractional positions; the file uses whole pixels.
    x: Math.round(element.x),
    y: Math.round(element.y),
    width: Math.round(element.width),
    height: Math.round(element.height),
    text: element.text,
    ...(element.value !== undefined ? { value: element.value } : {}),
    ...(element.active !== undefined ? { active: element.active } : {}),
    ...(element.props ? { props: { ...element.props } } : {}),
    ...(element.action ? { action: element.action } : {}),
  };
}

// Builds the scene file object described in the schema proposal.
export function buildProject(elements: SceneElement[]): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: PROJECT_NAME,
    screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    startSceneId: SCENE_ID,
    scenes: [
      {
        id: SCENE_ID,
        name: SCENE_NAME,
        elements: elements.map(toExportedElement),
      },
    ],
  };
}

function toFileName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "scene"}.json`;
}

// Saves the project as a .json file through the browser's download.
export function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = toFileName(project.name);

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
