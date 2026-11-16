import assert from "node:assert/strict";
import { test } from "node:test";
import { getImageGeometry, getImageUploadSize } from "./imageGeometry";
import { IMAGE_ACCEPT, MAX_IMAGE_SOURCE_LENGTH, isSafeImageSource, prepareImage } from "./imageUpload";

test("contain centers landscape and portrait images without cropping", () => {
  assert.deepEqual(getImageGeometry(400, 200, 100, 100), {
    x: 0, y: 25, width: 100, height: 50,
    crop: { x: 0, y: 0, width: 400, height: 200 },
  });
  assert.deepEqual(getImageGeometry(200, 400, 100, 100), {
    x: 25, y: 0, width: 50, height: 100,
    crop: { x: 0, y: 0, width: 200, height: 400 },
  });
});

test("cover crops the center of the source without extending destination bounds", () => {
  assert.deepEqual(getImageGeometry(400, 200, 100, 100, "cover"), {
    x: 0, y: 0, width: 100, height: 100,
    crop: { x: 100, y: 0, width: 200, height: 200 },
  });
  assert.deepEqual(getImageGeometry(200, 400, 100, 100, "cover"), {
    x: 0, y: 0, width: 100, height: 100,
    crop: { x: 0, y: 100, width: 200, height: 200 },
  });
});

test("stretch uses the full source and destination", () => {
  assert.deepEqual(getImageGeometry(400, 200, 80, 120, "stretch"), {
    x: 0, y: 0, width: 80, height: 120,
    crop: { x: 0, y: 0, width: 400, height: 200 },
  });
});

test("geometry rejects invalid dimensions and confines fractional crops", () => {
  for (const value of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(getImageGeometry(value, 20, 30, 40), null);
    assert.equal(getImageGeometry(20, value, 30, 40), null);
    assert.equal(getImageGeometry(20, 30, value, 40), null);
    assert.equal(getImageGeometry(20, 30, 40, value), null);
  }
  for (const fit of ["contain", "cover", "stretch"] as const) {
    const result = getImageGeometry(1920, 1080, 131, 87, fit)!;
    assert.ok(result.x >= 0 && result.y >= 0);
    assert.ok(result.x + result.width <= 131 && result.y + result.height <= 87);
    assert.ok(result.crop.x >= 0 && result.crop.y >= 0);
    assert.ok(result.crop.x + result.crop.width <= 1920);
    assert.ok(result.crop.y + result.crop.height <= 1080);
  }
});

test("upload dimensions cap the longest edge, never upscale, and retain thin images", () => {
  assert.deepEqual(getImageUploadSize(4000, 2000), { width: 1600, height: 800 });
  assert.deepEqual(getImageUploadSize(2000, 4000), { width: 800, height: 1600 });
  assert.deepEqual(getImageUploadSize(400, 200), { width: 400, height: 200 });
  assert.deepEqual(getImageUploadSize(1, 40000), { width: 1, height: 1600 });
  assert.deepEqual(getImageUploadSize(2049, 2048), { width: 1600, height: 1599 });
  assert.throws(() => getImageUploadSize(0, 10), /dimensions/);
  assert.throws(() => getImageUploadSize(10, NaN), /dimensions/);
});

test("safe sources allow empty, bounded raster data URLs, and credential-free HTTPS", () => {
  assert.equal(IMAGE_ACCEPT, "image/png,image/jpeg,image/webp");
  assert.equal(MAX_IMAGE_SOURCE_LENGTH, 350_000);
  for (const src of ["", "data:image/png;base64,AAAA", "data:image/jpeg;base64,AAA=", "data:image/webp;base64,AA==", "https://example.com/image.png?version=1"]) {
    assert.equal(isSafeImageSource(src), true, src);
  }
  const prefix = "data:image/png;base64,";
  const data = "A".repeat(Math.floor((MAX_IMAGE_SOURCE_LENGTH - prefix.length) / 4) * 4);
  assert.equal(isSafeImageSource(prefix + data), true);
  assert.equal(isSafeImageSource(prefix + data + "AAAA"), false);
  assert.equal(isSafeImageSource("https://example.com/" + "a".repeat(2048)), false);
});

test("unsafe schemes, malformed base64, credentials, and ambiguous URLs are rejected", () => {
  for (const src of [
    "javascript:alert(1)", "blob:https://example.com/image", "http://example.com/image.png",
    "data:image/svg+xml;base64,AAAA", "data:image/gif;base64,AAAA", "data:text/html;base64,AAAA",
    "data:image/png,AAAA", "data:image/png;base64,", "data:image/png;base64,AAA",
    "data:image/png;base64,A===", "data:image/png;base64,AA=A", "data:image/png;base64,AA==\n",
    "data:image/png;base64,!!!!", "data:image/png;charset=utf-8;base64,AAAA",
    "//example.com/a.png", "/a.png", " https://example.com/a.png", "https://user:secret@example.com/image.png",
    "https://example.com/\nimage.png", "https://example.com/\\image.png", "https://",
  ]) assert.equal(isSafeImageSource(src), false, src);
});

test("upload validation rejects empty, oversized, unsupported, mismatched, and forged files before decoding", async () => {
  await assert.rejects(prepareImage(new File([], "empty.png", { type: "image/png" })), /empty/);
  await assert.rejects(prepareImage(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })), /10 MiB/);
  await assert.rejects(prepareImage(new File(["<svg/>"], "vector.svg", { type: "image/svg+xml" })), /PNG, JPEG, or WebP/);
  await assert.rejects(prepareImage(new File(["not a raster"], "forged.png", { type: "image/png" })), /contents/);
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  await assert.rejects(prepareImage(new File([png], "mismatch.jpg", { type: "image/jpeg" })), /contents/);
  // Valid signatures with absent MIME reach the browser decoder rather than being rejected as a file type.
  for (const bytes of [png, Uint8Array.from([255, 216, 255]), new TextEncoder().encode("RIFF0000WEBP")]) {
    await assert.rejects(prepareImage(new File([bytes], "untyped")), /requires a browser/);
  }
});

test("browser adapter cleans up decoding and exercises quality, downscale, PNG fallback, and pixel limits", async (t) => {
  const imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Image");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  let sourceWidth = 4000;
  let sourceHeight = 2000;
  let decodeError = false;
  let encodeError = false;
  let webp = true;
  const qualities: (number | undefined)[] = [];
  const images: FakeImage[] = [];
  class FakeImage {
    get naturalWidth() { return sourceWidth; }
    get naturalHeight() { return sourceHeight; }
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { images.push(this); }
    set src(_value: string) {
      queueMicrotask(() => decodeError ? this.onerror?.() : this.onload?.());
    }
    removeAttribute() {}
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage() {}, imageSmoothingEnabled: false, imageSmoothingQuality: "low" }),
    toDataURL: (_mime: string, quality?: number) => {
      if (encodeError) throw new Error("Encoder unavailable");
      qualities.push(quality);
      const prefix = webp ? "data:image/webp;base64," : "data:image/png;base64,";
      const tooLarge = webp ? quality! > 0.5 : canvas.width > 1000;
      return prefix + (tooLarge ? "A".repeat(MAX_IMAGE_SOURCE_LENGTH) : "AAAA");
    },
  };
  const create = t.mock.method(URL, "createObjectURL", () => "blob:local-test");
  const revoke = t.mock.method(URL, "revokeObjectURL", () => {});
  Object.defineProperty(globalThis, "Image", { configurable: true, value: FakeImage });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
  const file = new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], "local.png");
  try {
    const optimized = await prepareImage(file);
    assert.deepEqual(optimized, { src: "data:image/webp;base64,AAAA", width: 1600, height: 800, name: "local.png" });
    assert.deepEqual(qualities, [0.9, 0.78, 0.64, 0.5]);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);

    webp = false;
    qualities.length = 0;
    const fallback = await prepareImage(file);
    assert.deepEqual(fallback, { src: "data:image/png;base64,AAAA", width: 900, height: 450, name: "local.png" });
    assert.equal(qualities.length, 3);

    decodeError = true;
    await assert.rejects(prepareImage(file), /could not be decoded/);
    decodeError = false;
    sourceWidth = 10000;
    sourceHeight = 5000;
    await assert.rejects(prepareImage(file), /40 million pixels/);

    sourceWidth = sourceHeight = 10;
    encodeError = true;
    await assert.rejects(prepareImage(file), /Image optimization failed: Encoder unavailable/);
    assert.equal(canvas.width, 0);
    assert.equal(create.mock.callCount(), 5);
    assert.equal(revoke.mock.callCount(), 5);
    assert.ok(images.every((image) => image.onload === null && image.onerror === null));
  } finally {
    if (imageDescriptor) Object.defineProperty(globalThis, "Image", imageDescriptor);
    else Reflect.deleteProperty(globalThis, "Image");
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
