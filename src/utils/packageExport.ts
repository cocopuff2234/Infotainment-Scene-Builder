import type { Project } from "../types/scene";
import { parseProject } from "./projectDocument";
import { analyzeRuntimeCompatibility } from "./runtimeCompatibility";

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const packedDate = ((year - 1980) << 9) | (month << 5) | day;
  return { time, date: packedDate };
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function header(size: number, write: (view: DataView) => void) {
  const bytes = new Uint8Array(size);
  write(new DataView(bytes.buffer));
  return bytes;
}

/** Create a dependency-free ZIP using the STORE method. Browsers and Python zipfile can read it directly. */
export function createStoredZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosTimestamp();
  const entries = Object.entries(files);

  for (const [name, value] of entries) {
    const nameBytes = encoder.encode(name.replace(/^\/+/, ""));
    const data = typeof value === "string" ? encoder.encode(value) : value;
    const crc = crc32(data);
    const localHeader = header(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, stamp.time, true);
      view.setUint16(12, stamp.date, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
    });
    localParts.push(localHeader, nameBytes, data);

    const centralHeader = header(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, stamp.time, true);
      view.setUint16(14, stamp.date, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, nameBytes.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, offset, true);
    });
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }

  const central = concat(centralParts);
  const end = header(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entries.length, true);
    view.setUint16(10, entries.length, true);
    view.setUint32(12, central.length, true);
    view.setUint32(16, offset, true);
    view.setUint16(20, 0, true);
  });
  return concat([...localParts, central, end]);
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "scene";
}

export function buildProjectPackage(projectInput: Project, runtimeFiles: Record<string, Uint8Array> = {}): Uint8Array {
  const project = parseProject(projectInput);
  const report = analyzeRuntimeCompatibility(project, Object.keys(runtimeFiles));
  if (!report.compatible) throw new Error(report.errors[0] ?? "Project is not compatible with the Pi runtime");
  const manifest = {
    packageVersion: 1,
    projectFile: "project.json",
    runtime: project.runtime,
    requiredFiles: report.requiredFiles,
    networkResources: report.networkResources,
    createdAt: new Date().toISOString(),
  };
  const instructions = [
    "Infotainment Scene Package",
    "==========================",
    "",
    "project.json is the Scene Builder document consumed by the PySide6/QML runtime.",
    "Copy any files listed in package-manifest.json requiredFiles into this package using the exact relative paths.",
    "For example media/song.mp3 belongs in the media/ folder and assets/widget.png belongs in assets/.",
    "The Raspberry Pi runtime can install this ZIP directly after all required local files are present.",
    "",
  ].join("\n");
  const files: Record<string, string | Uint8Array> = {
    "project.json": JSON.stringify(project, null, 2),
    "package-manifest.json": JSON.stringify(manifest, null, 2),
    "PACKAGE_README.txt": instructions,
    "media/README.txt": "Local audio files referenced by project.json live here.\n",
    "assets/README.txt": "Custom runtime assets referenced by project.json live here.\n",
  };
  for (const path of report.requiredFiles) {
    if (runtimeFiles[path]) files[path] = runtimeFiles[path];
  }
  return createStoredZip(files);
}

export function downloadProjectPackage(project: Project, runtimeFiles: Record<string, Uint8Array> = {}) {
  const bytes = buildProjectPackage(project, runtimeFiles);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug(project.name)}.infotainment.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
