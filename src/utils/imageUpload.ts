import { getImageUploadSize } from "./imageGeometry";

export type UploadedImage = { src: string; width: number; height: number; name: string };

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export const MAX_IMAGE_SOURCE_LENGTH = 350_000;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DECODED_PIXELS = 40_000_000;
const MAX_HTTPS_LENGTH = 2048;

/** Embedded rasters or bounded, credential-free HTTPS references only. */
export function isSafeImageSource(src: string): boolean {
  if (src === "") return true;
  if (src.length > MAX_IMAGE_SOURCE_LENGTH) return false;
  const prefix = /^data:image\/(?:png|jpeg|webp);base64,/.exec(src);
  if (prefix) {
    const data = src.slice(prefix[0].length);
    return data.length > 0 && data.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(data);
  }
  if (src.length > MAX_HTTPS_LENGTH || !src.startsWith("https://")) return false;
  // URL parsing normalizes some whitespace/control characters; reject them before parsing.
  if (/[\s\\]/.test(src) || [...src].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function imageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70
    && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return "image/webp";
  }
  return null;
}

async function loadUpload(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => finish(new Error("Image decoding timed out. Try a smaller image.")), 30_000);
      function finish(error?: Error) {
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        if (error) {
          image.removeAttribute("src");
          reject(error);
        } else {
          resolve(image);
        }
      }
      image.onload = () => finish();
      image.onerror = () => finish(new Error("This image could not be decoded. Choose a valid PNG, JPEG, or WebP file."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** All decoding and metadata-stripping re-encoding happens locally in the browser. */
export async function prepareImage(file: File): Promise<UploadedImage> {
  if (file.size === 0) throw new Error("The image file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Image files must be 10 MiB or smaller.");
  const declaredMime = file.type.toLowerCase();
  if (declaredMime && !IMAGE_ACCEPT.split(",").includes(declaredMime)) {
    throw new Error("Choose a PNG, JPEG, or WebP image. Other formats, including SVG, are not supported.");
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  } catch {
    throw new Error("The image file could not be read. Please select it again.");
  }
  const detectedMime = imageMime(bytes);
  if (!detectedMime || (declaredMime && declaredMime !== detectedMime)) {
    throw new Error("The image contents do not match a valid PNG, JPEG, or WebP file type.");
  }
  if (typeof Image === "undefined" || typeof document === "undefined") {
    throw new Error("Image processing requires a browser with canvas support.");
  }

  // A correctly typed Blob also allows files whose operating system supplied no MIME type.
  const image = await loadUpload(new File([file], file.name, { type: detectedMime }));
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) throw new Error("The decoded image has invalid dimensions.");
  if (sourceWidth * sourceHeight > MAX_DECODED_PIXELS) {
    throw new Error("The decoded image exceeds 40 million pixels. Resize it before uploading.");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser does not support canvas image processing.");
  let { width, height } = getImageUploadSize(sourceWidth, sourceHeight);
  let webpSupported = true;
  try {
    while (true) {
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      // Drawing onto a fresh transparent canvas preserves alpha and omits source metadata.
      context.drawImage(image, 0, 0, width, height);
      for (const quality of [0.9, 0.78, 0.64, 0.5, 0.36]) {
        const src = webpSupported ? canvas.toDataURL("image/webp", quality) : canvas.toDataURL("image/png");
        if (src.startsWith("data:image/png;")) webpSupported = false;
        if (!src.startsWith("data:image/webp;") && !src.startsWith("data:image/png;")) {
          throw new Error("Your browser could not encode this image as WebP or PNG.");
        }
        if (src.length <= MAX_IMAGE_SOURCE_LENGTH && isSafeImageSource(src)) {
          return { src, width, height, name: file.name };
        }
        // PNG has no quality setting: reduce dimensions instead of encoding it repeatedly.
        if (!webpSupported) break;
      }
      if (width === 1 && height === 1) {
        throw new Error("This image could not be reduced to the project's image size limit.");
      }
      width = Math.max(1, Math.floor(width * 0.75));
      height = Math.max(1, Math.floor(height * 0.75));
    }
  } catch (error) {
    throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : "please try another image."}`);
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
