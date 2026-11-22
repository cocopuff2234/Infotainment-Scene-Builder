import { Circle, Rect, Text } from "react-konva";

import { ASSET_BY_TYPE, GROUP_ACCENT } from "../data/assets";
import type { PropValue, SceneElement } from "../types/scene";
import { SceneImage } from "./SceneImage";

type ElementShapeProps = {
  element: SceneElement;
  isSelected: boolean;
};

const FONT = "Inter, sans-serif";

function numberProp(
  props: Record<string, PropValue> | undefined,
  key: string,
  fallback: number,
) {
  const value = props?.[key];
  return typeof value === "number" ? value : fallback;
}

function booleanProp(
  props: Record<string, PropValue> | undefined,
  key: string,
  fallback: boolean,
) {
  const value = props?.[key];
  return typeof value === "boolean" ? value : fallback;
}

// Draws one element inside its (draggable) Group. Everything that should
// not intercept clicks has listening={false}, so the Group stays easy to
// select and drag.
export function ElementShape({ element, isSelected }: ElementShapeProps) {
  const asset = ASSET_BY_TYPE[element.type];
  const { width, height, text, props } = element;

  const outline = isSelected ? "#93c5fd" : undefined;
  const outlineWidth = isSelected ? 3 : 0;

  const borderColor = outline ?? "#334155";
  const borderWidth = isSelected ? 3 : 1;

  if (element.type === "image") {
    const src = typeof props?.src === "string" ? props.src : "";
    const fit = props?.fit === "cover" || props?.fit === "stretch" ? props.fit : "contain";
    return (
      <>
        <Rect width={width} height={height} fill={src ? "rgba(0, 0, 0, 0.001)" : "#0b1120"} />
        <SceneImage src={src} width={width} height={height} fit={fit} />
        <Rect
          width={width}
          height={height}
          stroke={src && !isSelected ? undefined : borderColor}
          strokeWidth={borderWidth}
          strokeScaleEnabled={false}
          listening={false}
        />
      </>
    );
  }

  switch (asset.preview) {
    case "button":
      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="#2563eb"
            cornerRadius={10}
            stroke={outline}
            strokeWidth={outlineWidth}
          />

          <Text
            width={width}
            height={height}
            text={text}
            align="center"
            verticalAlign="middle"
            fontSize={16}
            fontFamily={FONT}
            fill="#ffffff"
            listening={false}
          />
        </>
      );

    case "text":
      return (
        <>
          {/* Nearly transparent so the label can still be grabbed */}
          <Rect
            width={width}
            height={height}
            fill="rgba(0, 0, 0, 0.001)"
            cornerRadius={6}
            stroke={outline}
            strokeWidth={outlineWidth}
            dash={[6, 4]}
          />

          <Text
            x={8}
            width={width - 16}
            height={height}
            text={text}
            verticalAlign="middle"
            fontSize={numberProp(props, "fontSize", 24)}
            fontFamily={FONT}
            fill="#e5e7eb"
            listening={false}
          />
        </>
      );

    case "panel":
      return (
        <Rect
          width={width}
          height={height}
          fill="#1e293b"
          cornerRadius={14}
          stroke={borderColor}
          strokeWidth={borderWidth}
        />
      );

    case "hotspot":
      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="rgba(96, 165, 250, 0.08)"
            cornerRadius={8}
            stroke={outline ?? "#60a5fa"}
            strokeWidth={isSelected ? 3 : 1.5}
            dash={[8, 5]}
          />
          <Text
            width={width}
            height={height}
            text={text || "Empty"}
            align="center"
            verticalAlign="middle"
            fontSize={12}
            fontFamily={FONT}
            fill="#93c5fd"
            listening={false}
          />
        </>
      );

    case "icon":
      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="#1e293b"
            cornerRadius={14}
            stroke={borderColor}
            strokeWidth={borderWidth}
          />

          <Text
            width={width}
            height={height}
            text={text}
            align="center"
            verticalAlign="middle"
            fontSize={Math.round(Math.min(width, height) * 0.5)}
            fontFamily={FONT}
            fill="#e5e7eb"
            listening={false}
          />
        </>
      );

    case "placeholder":
      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="#0b1120"
            cornerRadius={10}
            stroke={outline ?? "#475569"}
            strokeWidth={isSelected ? 3 : 1.5}
            dash={[8, 5]}
          />

          <Text
            y={height / 2 - 34}
            width={width}
            text={asset.icon}
            align="center"
            fontSize={32}
            listening={false}
          />

          <Text
            y={height / 2 + 8}
            width={width}
            text={text}
            align="center"
            fontSize={14}
            fontFamily={FONT}
            fill="#94a3b8"
            listening={false}
          />
        </>
      );

    case "slider": {
      const min = numberProp(props, "min", 0);
      const max = numberProp(props, "max", 100);
      const value = numberProp(props, "value", 50);

      const ratio =
        max > min
          ? Math.min(Math.max((value - min) / (max - min), 0), 1)
          : 0;

      const trackWidth = width - 24;
      const trackY = height - 16;

      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="#0f172a"
            cornerRadius={8}
            stroke={borderColor}
            strokeWidth={borderWidth}
          />

          <Text
            x={12}
            y={8}
            text={text}
            fontSize={12}
            fontFamily={FONT}
            fill="#94a3b8"
            listening={false}
          />

          <Rect
            x={12}
            y={trackY}
            width={trackWidth}
            height={6}
            cornerRadius={3}
            fill="#334155"
            listening={false}
          />

          <Rect
            x={12}
            y={trackY}
            width={trackWidth * ratio}
            height={6}
            cornerRadius={3}
            fill="#2563eb"
            listening={false}
          />

          <Circle
            x={12 + trackWidth * ratio}
            y={trackY + 3}
            radius={9}
            fill="#ffffff"
            listening={false}
          />
        </>
      );
    }

    case "toggle": {
      const isOn = booleanProp(props, "value", false);
      const pillX = width - 56;

      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="#0f172a"
            cornerRadius={8}
            stroke={borderColor}
            strokeWidth={borderWidth}
          />

          <Text
            x={12}
            width={pillX - 20}
            height={height}
            text={text}
            verticalAlign="middle"
            fontSize={14}
            fontFamily={FONT}
            fill="#e2e8f0"
            listening={false}
          />

          <Rect
            x={pillX}
            y={(height - 24) / 2}
            width={44}
            height={24}
            cornerRadius={12}
            fill={isOn ? "#2563eb" : "#475569"}
            listening={false}
          />

          <Circle
            x={isOn ? pillX + 32 : pillX + 12}
            y={height / 2}
            radius={9}
            fill="#ffffff"
            listening={false}
          />
        </>
      );
    }

    case "card":
    default: {
      const valueSize = Math.max(
        14,
        Math.min(30, Math.round(height * 0.26)),
      );

      return (
        <>
          <Rect
            width={width}
            height={height}
            fill="#1e293b"
            cornerRadius={12}
            stroke={borderColor}
            strokeWidth={borderWidth}
          />

          <Rect
            y={14}
            width={4}
            height={height - 28}
            cornerRadius={2}
            fill={GROUP_ACCENT[asset.group]}
            listening={false}
          />

          <Text
            x={16}
            y={12}
            width={width - 28}
            text={`${asset.icon}  ${asset.label}`}
            fontSize={12}
            fontFamily={FONT}
            fill="#94a3b8"
            wrap="none"
            ellipsis
            listening={false}
          />

          <Text
            x={16}
            y={34}
            width={width - 32}
            height={height - 46}
            text={text}
            fontSize={valueSize}
            fontStyle="bold"
            fontFamily={FONT}
            fill="#ffffff"
            verticalAlign="middle"
            ellipsis
            listening={false}
          />
        </>
      );
    }
  }
}
