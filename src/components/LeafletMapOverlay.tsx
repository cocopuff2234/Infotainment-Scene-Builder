import { useEffect, useRef, useState } from "react";
import type { SceneElement } from "../types/scene";

const LEAFLET_CSS_URL = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Leaflet is loaded lazily only for Preview. Keeping it out of the editor bundle lets
// edit mode remain a lightweight Konva canvas while still providing a real MVP map.
type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  invalidateSize: () => void;
  remove: () => void;
};

type LeafletLayer = { addTo: (map: LeafletMap) => unknown };

type LeafletNamespace = {
  map: (container: HTMLElement, options: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => LeafletLayer;
  circleMarker: (center: [number, number], options: Record<string, unknown>) => LeafletLayer;
};

type LeafletWindow = Window & typeof globalThis & { L?: LeafletNamespace };

let leafletPromise: Promise<LeafletNamespace> | undefined;

function loadLeaflet() {
  const leafletWindow = window as LeafletWindow;
  if (leafletWindow.L) return Promise.resolve(leafletWindow.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise<LeafletNamespace>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = LEAFLET_CSS_URL;
      stylesheet.crossOrigin = "anonymous";
      document.head.appendChild(stylesheet);
    }

    const finish = () => {
      const loaded = (window as LeafletWindow).L;
      if (loaded) resolve(loaded);
      else reject(new Error("Leaflet loaded without exposing its browser API"));
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Leaflet failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("Leaflet failed to load")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    leafletPromise = undefined;
    throw error;
  });

  return leafletPromise;
}

function numberProp(element: SceneElement, key: string, fallback: number) {
  const value = element.props?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanProp(element: SceneElement, key: string, fallback: boolean) {
  const value = element.props?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export function LeafletMapOverlay({ element, scale }: { element: SceneElement; scale: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const centerLat = numberProp(element, "centerLat", 37.3382);
  const centerLng = numberProp(element, "centerLng", -121.8863);
  const zoom = numberProp(element, "zoom", 14);
  const showCurrentLocation = booleanProp(element, "showCurrentLocation", true);
  const allowPan = booleanProp(element, "allowPan", true);
  const allowZoom = booleanProp(element, "allowZoom", true);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    setFailed(false);

    void loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, {
        attributionControl: true,
        zoomControl: allowZoom,
        dragging: allowPan,
        keyboard: allowPan,
        scrollWheelZoom: allowZoom,
        doubleClickZoom: allowZoom,
        touchZoom: allowZoom,
        boxZoom: allowZoom,
      }).setView([centerLat, centerLng], zoom);

      L.tileLayer(OSM_TILES, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      if (showCurrentLocation) {
        L.circleMarker([centerLat, centerLng], {
          radius: 8,
          color: "#dbeafe",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 1,
        }).addTo(map);
      }

      window.setTimeout(() => map?.invalidateSize(), 0);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [allowPan, allowZoom, centerLat, centerLng, showCurrentLocation, zoom]);

  return (
    <div
      className="leaflet-map-overlay"
      style={{
        left: 8 + element.x * scale,
        top: 8 + element.y * scale,
        width: element.width * scale,
        height: element.height * scale,
        borderRadius: Math.max(4, 16 * scale),
      }}
      aria-label={`${element.text || "Map"} interactive map preview`}
    >
      <div ref={containerRef} className="leaflet-map-surface" />
      {failed && <div className="leaflet-map-error">Real map preview unavailable. Check your internet connection.</div>}
    </div>
  );
}
