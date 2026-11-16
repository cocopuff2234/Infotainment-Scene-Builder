import { useEffect, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import { getImageGeometry } from "../utils/imageGeometry";
import type { ImageFit } from "../utils/imageGeometry";
import { isSafeImageSource } from "../utils/imageUpload";

export type SceneImageProps = {
  src: string;
  width: number;
  height: number;
  fit?: ImageFit;
};

type LoadState = { status: "loading" | "error" } | { status: "ready"; image: HTMLImageElement };

/** Keying the loader prevents even one render of the previous source after a change. */
export function SceneImage(props: SceneImageProps) {
  return <ImageSource key={props.src} {...props} />;
}

function ImageSource({ src, width, height, fit = "contain" }: SceneImageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const safe = isSafeImageSource(src);

  useEffect(() => {
    if (!src || !safe) return;
    let active = true;
    const image = new Image();
    const timeout = setTimeout(fail, 30_000);
    function clearListeners() {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    }
    function fail() {
      clearListeners();
      if (active) setState({ status: "error" });
      image.removeAttribute("src");
    }
    image.onload = () => {
      clearListeners();
      if (!active) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) {
        fail();
      } else {
        setState({ status: "ready", image });
      }
    };
    image.onerror = fail;
    if (src.startsWith("https://")) {
      image.crossOrigin = "anonymous";
      image.referrerPolicy = "no-referrer";
    }
    image.src = src;
    return () => {
      active = false;
      clearListeners();
      image.removeAttribute("src");
    };
  }, [src, safe]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const geometry = state.status === "ready"
    ? getImageGeometry(state.image.naturalWidth, state.image.naturalHeight, width, height, fit)
    : null;
  const message = !src ? "No image selected" : !safe || state.status === "error" ? "Image unavailable" : "Loading image…";

  return (
    <Group width={width} height={height} clipX={0} clipY={0} clipWidth={width} clipHeight={height} listening={false}>
      {state.status === "ready" && geometry ? (
        <KonvaImage image={state.image} {...geometry} listening={false} />
      ) : (
        <>
          <Rect width={width} height={height} fill="rgba(148, 163, 184, 0.06)" listening={false} />
          <Text
            width={width}
            height={height}
            text={message}
            align="center"
            verticalAlign="middle"
            padding={8}
            fontFamily="Inter, sans-serif"
            fontSize={12}
            fill="#94a3b8"
            listening={false}
          />
        </>
      )}
    </Group>
  );
}
