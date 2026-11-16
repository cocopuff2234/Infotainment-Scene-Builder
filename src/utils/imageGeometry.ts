export type ImageFit = "contain" | "cover" | "stretch";

type Rectangle = { x: number; y: number; width: number; height: number };

export type ImageGeometry = Rectangle & { crop: Rectangle };

/** Centered destination and source crop, both confined to their own bounds. */
export function getImageGeometry(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  fit: ImageFit = "contain",
): ImageGeometry | null {
  if (![sourceWidth, sourceHeight, width, height].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }

  const crop = { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  if (fit === "stretch") return { x: 0, y: 0, width, height, crop };

  const scale = fit === "cover"
    ? Math.max(width / sourceWidth, height / sourceHeight)
    : Math.min(width / sourceWidth, height / sourceHeight);

  if (fit === "cover") {
    crop.width = Math.min(sourceWidth, width / scale);
    crop.height = Math.min(sourceHeight, height / scale);
    crop.x = (sourceWidth - crop.width) / 2;
    crop.y = (sourceHeight - crop.height) / 2;
    return { x: 0, y: 0, width, height, crop };
  }

  const drawnWidth = Math.min(width, sourceWidth * scale);
  const drawnHeight = Math.min(height, sourceHeight * scale);
  return {
    x: (width - drawnWidth) / 2,
    y: (height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
    crop,
  };
}

/** Never upscale an upload. Round down so the longest edge stays within the limit. */
export function getImageUploadSize(width: number, height: number, maxEdge = 1600) {
  if (![width, height, maxEdge].every((value) => Number.isFinite(value) && value >= 1)) {
    throw new Error("Image dimensions must be positive finite numbers.");
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
