import type { Project } from "../types/scene";
import { parseProject } from "./projectDocument";

export type RuntimeCompatibilityReport = {
  compatible: boolean;
  errors: string[];
  warnings: string[];
  requiredFiles: string[];
  missingFiles: string[];
  networkResources: string[];
  sceneCount: number;
  elementCount: number;
};

function addUnique(values: string[], value: string) {
  if (value && !values.includes(value)) values.push(value);
}

export function analyzeRuntimeCompatibility(input: Project, bundledFiles: string[] = []): RuntimeCompatibilityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredFiles: string[] = [];
  const networkResources: string[] = [];
  let project: Project;

  try {
    project = parseProject(input);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Project validation failed");
    return { compatible: false, errors, warnings, requiredFiles, missingFiles: [], networkResources, sceneCount: input.scenes?.length ?? 0, elementCount: 0 };
  }

  let hasMap = false;
  let elementCount = 0;
  for (const scene of project.scenes) {
    const background = scene.background?.image;
    if (background?.startsWith("https://")) addUnique(networkResources, background);
    elementCount += scene.elements.length;
    for (const element of scene.elements) {
      if (element.type === "map") hasMap = true;
      const mediaPath = element.props?.mediaPath;
      if (typeof mediaPath === "string" && mediaPath) addUnique(requiredFiles, mediaPath);
      const assetFile = element.props?.assetFile;
      if (typeof assetFile === "string" && assetFile) addUnique(requiredFiles, assetFile);
      const src = element.props?.src;
      if (typeof src === "string" && src.startsWith("https://")) addUnique(networkResources, src);
    }
  }

  const bundled = new Set(bundledFiles);
  const missingFiles = requiredFiles.filter((path) => !bundled.has(path));
  if (missingFiles.length) {
    warnings.push(`${missingFiles.length} referenced local file${missingFiles.length === 1 ? " is" : "s are"} not attached to this browser session. Attach it in the component inspector or add it to the package later at the exact relative path.`);
  }
  if (hasMap) warnings.push("OSM maps require a network connection in the current MVP; the Pi runtime falls back safely when maps are unavailable.");
  if (networkResources.length) warnings.push(`${networkResources.length} HTTPS image resource${networkResources.length === 1 ? " depends" : "s depend"} on network access.`);

  return {
    compatible: errors.length === 0,
    errors,
    warnings,
    requiredFiles: requiredFiles.sort(),
    missingFiles: missingFiles.sort(),
    networkResources: networkResources.sort(),
    sceneCount: project.scenes.length,
    elementCount,
  };
}
