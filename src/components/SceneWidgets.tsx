import { useEffect, useRef } from "react";
import { Arc, Circle, Group, Line, Rect, Text } from "react-konva";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Circle as KonvaCircle } from "konva/lib/shapes/Circle";
import type { KonvaEventObject } from "konva/lib/Node";
import type { SceneElement } from "../types/scene";
import { ElementShape } from "./ElementShape";

const blue = "#5795ff";
const white = "#edf4ff";
const muted = "#8294b1";
const font = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

type WidgetProps = {
  element: SceneElement;
  preview: boolean;
  onUpdate: (id: string, patch: Partial<SceneElement>) => void;
};

function Label({ x = 0, y = 0, width, text, size = 12, color = white, bold = false, align = "left" }: {
  x?: number; y?: number; width?: number; text: string; size?: number;
  color?: string; bold?: boolean; align?: "left" | "center" | "right";
}) {
  return <Text x={x} y={y} width={width} text={text} fontSize={size} fill={color}
    fontFamily={font} fontStyle={bold ? "bold" : "normal"} align={align} listening={false} />;
}

function Card({ width, height }: { width: number; height: number }) {
  return <Rect width={width} height={height} cornerRadius={18} stroke="#293c58" strokeWidth={1}
    fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: width, y: height }}
    fillLinearGradientColorStops={[0, "#18273e", 1, "#101c30"]} />;
}

function Control({ x, y, text, enabled, onPress, primary = false, size = 32 }: {
  x: number; y: number; text: string; enabled: boolean; onPress: () => void; primary?: boolean; size?: number;
}) {
  function press(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!enabled) return;
    event.cancelBubble = true;
    onPress();
  }
  return <Group x={x} y={y} onClick={press} onTap={press}>
    <Circle radius={size / 2} fill={primary ? blue : "#22344e"} stroke={primary ? "#81b0ff" : "#344762"} strokeWidth={1} />
    <Label x={-size / 2} y={-8} width={size} align="center" text={text} size={18} color={primary ? "#08152b" : white} bold />
  </Group>;
}

function MapWidget({ element }: WidgetProps) {
  const streets = [
    [-30, 65, 570, 65], [-30, 135, 570, 135], [-30, 215, 570, 215], [-30, 285, 570, 285],
    [62, -20, 62, 350], [160, -20, 160, 350], [270, -20, 270, 350], [385, -20, 385, 350], [482, -20, 482, 350],
    [-40, 300, 175, 100, 300, -20], [180, 350, 360, 180, 580, 0],
  ];
  return <Group scaleX={element.width / 540} scaleY={element.height / 330}>
    <Card width={540} height={330} />
    <Group clipX={1} clipY={1} clipWidth={538} clipHeight={328} listening={false}>
      <Rect x={1} y={1} width={538} height={328} fill="#101e30" cornerRadius={18} />
      <Line points={[425, -20, 450, 50, 425, 125, 451, 205, 427, 350, 560, 350, 560, -20]} closed fill="#122d43" />
      <Rect x={77} y={151} width={67} height={48} cornerRadius={9} fill="#16332f" />
      <Rect x={287} y={80} width={80} height={40} cornerRadius={7} fill="#17332f" />
      {streets.map((points, i) => <Line key={i} points={points} stroke="#26364b" strokeWidth={i > 8 ? 14 : 10} lineCap="round" lineJoin="round" />)}
      {streets.map((points, i) => <Line key={i} points={points} stroke="#1a2a3e" strokeWidth={i > 8 ? 9 : 6} lineCap="round" lineJoin="round" />)}
      <Label x={300} y={142} text="HAYES VALLEY" size={9} color="#637791" />
      <Label x={79} y={169} text="Patricia’s Green" size={8} color="#628b7d" />
      <Label x={277} y={225} text="Oak St" size={9} color="#71829b" />
      <Label x={168} y={89} text="Octavia St" size={9} color="#71829b" />
      <Label x={430} y={162} text="THE BAY" size={9} color="#48718c" />
      <Line points={[160, 252, 160, 215, 270, 215, 270, 135, 385, 135, 385, 85]} stroke="#172c54" strokeWidth={16} lineCap="round" lineJoin="round" />
      <Line points={[160, 252, 160, 215, 270, 215, 270, 135, 385, 135, 385, 85]} stroke={blue} strokeWidth={6} lineCap="round" lineJoin="round" shadowColor={blue} shadowBlur={12} shadowOpacity={0.5} />
      <Circle x={385} y={85} radius={10} fill="#d8e8ff" stroke={blue} strokeWidth={4} />
      <Circle x={160} y={251} radius={24} fill="#5795ff" opacity={0.14} />
      <Line points={[160, 238, 170, 261, 160, 257, 150, 261]} closed fill="#eef6ff" stroke={blue} strokeWidth={2} lineJoin="round" />
      <Rect x={18} y={18} width={282} height={60} cornerRadius={12} fill="#101c30" stroke="#344b69" />
      <Label x={33} y={32} text="↱" size={30} color="#83afff" />
      <Label x={75} y={30} text="In 400 m, turn right" size={11} color={muted} />
      <Label x={75} y={48} text={element.text} size={16} bold />
      <Circle x={503} y={39} radius={17} fill="#122037" stroke="#344b69" />
      <Label x={490} y={32} width={26} text="N ↑" size={11} align="center" />
      <Rect x={18} y={278} width={504} height={36} cornerRadius={10} fill="#0c182a" stroke="#2c405c" />
      <Label x={32} y={290} text="12 min" size={13} bold color="#8eb8ff" />
      <Label x={95} y={291} text="4.8 km  ·  Arrival 09:53" size={11} color="#a5b5cc" />
      <Circle x={449} y={296} radius={3} fill="#64d5b0" />
      <Label x={459} y={291} text="OFFLINE" size={8} color={muted} />
    </Group>
  </Group>;
}

function MusicWidget({ element, preview, onUpdate }: WidgetProps) {
  const playing = element.active ?? false;
  return <Group scaleX={element.width / 340} scaleY={element.height / 210}>
    <Card width={340} height={210} />
    <Group listening={false}>
      <Label x={20} y={19} text="NOW PLAYING" size={9} color={muted} bold />
      <Label x={281} y={18} text="♫" size={16} color={blue} />
      <Rect x={20} y={44} width={82} height={82} cornerRadius={12}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: 82, y: 82 }}
        fillLinearGradientColorStops={[0, "#3e66a4", 0.5, "#a08db9", 1, "#dca994"]} />
      <Circle x={77} y={66} radius={13} fill="#ffe0c0" opacity={0.8} />
      <Line points={[20, 108, 44, 73, 66, 103, 82, 88, 102, 110, 102, 126, 20, 126]} closed fill="#273758" />
      <Line points={[20, 115, 48, 100, 67, 113, 86, 102, 102, 116, 102, 126, 20, 126]} closed fill="#17273f" />
      <Label x={115} y={53} width={206} text={element.text} size={19} bold />
      <Label x={115} y={81} text="ODESZA · A Moment Apart" size={11} color={muted} />
      <Label x={115} y={105} text="YOUR DAILY SOUNDTRACK" size={8} color="#5c7aa3" />
      <Line points={[22, 146, 318, 146]} stroke="#2b3b54" strokeWidth={3} lineCap="round" />
      <Line points={[22, 146, 138, 146]} stroke={blue} strokeWidth={3} lineCap="round" />
      <Circle x={138} y={146} radius={4} fill="#b4d1ff" />
      <Label x={22} y={158} text="1:42" size={9} color={muted} />
      <Label x={292} y={158} text="4:18" size={9} color={muted} />
      <Label x={103} y={179} text="ι◀" size={15} color="#a9bbd4" />
      <Label x={221} y={179} text="▶ι" size={15} color="#a9bbd4" />
      <Label x={24} y={184} text="↝" size={17} color={muted} />
      <Label x={302} y={184} text="↻" size={17} color={muted} />
    </Group>
    <Control x={170} y={183} size={36} text={playing ? "Ⅱ" : "▶"} enabled={preview} primary
      onPress={() => onUpdate(element.id, { active: !playing })} />
  </Group>;
}

function VolumeWidget({ element, preview, onUpdate }: WidgetProps) {
  const value = Math.round(Math.max(0, Math.min(100, element.value ?? 65)));
  const angle = 135 + value * 2.7;
  const radians = angle * Math.PI / 180;
  const groupRef = useRef<KonvaGroup>(null);
  const knobRef = useRef<KonvaCircle>(null);
  const activePointer = useRef<number | null>(null);

  useEffect(() => {
    const knob = knobRef.current;
    return () => {
      const pointerId = activePointer.current;
      activePointer.current = null;
      if (pointerId !== null) knob?.releaseCapture(pointerId);
    };
  }, [preview]);

  function adjustFromPointer() {
    // Invert both widget resizing and stage scaling before measuring the angle.
    const position = groupRef.current?.getRelativePointerPosition();
    if (!position) return;
    const dx = position.x - 100;
    const dy = position.y - 86;
    if (Math.hypot(dx, dy) < 6) return;
    const sweep = (Math.atan2(dy, dx) * 180 / Math.PI - 135 + 360) % 360;
    // The bottom 90° is a dead zone; use the nearest end of the 270° sweep.
    const boundedSweep = sweep <= 270 ? sweep : sweep < 315 ? 270 : 0;
    onUpdate(element.id, { value: Math.round(boundedSweep / 2.7) });
  }

  function startRotation(event: KonvaEventObject<PointerEvent>) {
    if (!preview || event.evt.button !== 0) return;
    event.cancelBubble = true;
    if (activePointer.current !== null) return;
    activePointer.current = event.evt.pointerId;
    knobRef.current?.setPointerCapture(event.evt.pointerId);
    adjustFromPointer();
  }

  function moveRotation(event: KonvaEventObject<PointerEvent>) {
    if (!preview || activePointer.current !== event.evt.pointerId) return;
    event.cancelBubble = true;
    adjustFromPointer();
  }

  function endRotation(event: KonvaEventObject<PointerEvent>) {
    if (activePointer.current !== event.evt.pointerId) return;
    event.cancelBubble = true;
    activePointer.current = null;
    knobRef.current?.releaseCapture(event.evt.pointerId);
  }

  return <Group ref={groupRef} scaleX={element.width / 200} scaleY={element.height / 170}>
    <Card width={200} height={170} />
    <Label x={16} y={15} width={168} text={element.text.toUpperCase()} size={9} bold color={muted} />
    <Group listening={false}>
      {Array.from({ length: 31 }, (_, i) => {
        const a = (135 + i * 9) * Math.PI / 180;
        return <Line key={i} points={[100 + Math.cos(a) * 49, 86 + Math.sin(a) * 49, 100 + Math.cos(a) * 54, 86 + Math.sin(a) * 54]}
          stroke={i <= value * 0.3 ? "#80b0ff" : "#35445e"} strokeWidth={i % 5 === 0 ? 2 : 1} lineCap="round" />;
      })}
      <Arc x={100} y={86} innerRadius={43} outerRadius={46} angle={270} rotation={135} fill="#2a3b55" />
      <Arc x={100} y={86} innerRadius={43} outerRadius={46} angle={Math.max(0.01, value * 2.7)} rotation={135} fill={blue} shadowColor={blue} shadowBlur={9} shadowOpacity={0.6} />
      <Circle x={100} y={86} radius={37} stroke="#3b506e" strokeWidth={1}
        fillLinearGradientStartPoint={{ x: -30, y: -35 }} fillLinearGradientEndPoint={{ x: 30, y: 35 }}
        fillLinearGradientColorStops={[0, "#344760", 0.45, "#1d2d45", 1, "#0c182a"]} shadowColor="#000" shadowBlur={12} shadowOpacity={0.4} shadowOffsetY={4} />
      <Circle x={100 + Math.cos(radians) * 29} y={86 + Math.sin(radians) * 29} radius={2.5} fill="#a8ccff" />
      <Label x={63} y={73} width={74} align="center" text={String(value)} size={27} bold />
      <Label x={63} y={102} width={74} align="center" text="VOLUME" size={7} color={muted} />
      <Label x={69} y={145} width={62} text={`${value}%`} size={11} color={muted} align="center" />
    </Group>
    <Circle ref={knobRef} x={100} y={86} radius={54} fill="rgba(0,0,0,0)" listening={preview}
      onPointerDown={startRotation} onPointerMove={moveRotation}
      onPointerUp={endRotation} onPointerCancel={endRotation} onLostPointerCapture={endRotation}
      onClick={(event) => { if (preview) event.cancelBubble = true; }}
      onTap={(event) => { if (preview) event.cancelBubble = true; }} />
    <Control x={35} y={141} text="−" size={29} enabled={preview} onPress={() => onUpdate(element.id, { value: Math.max(0, value - 5) })} />
    <Control x={165} y={141} text="+" size={29} enabled={preview} onPress={() => onUpdate(element.id, { value: Math.min(100, value + 5) })} />
  </Group>;
}

function ClimateWidget({ element, preview, onUpdate }: WidgetProps) {
  const value = Math.max(16, Math.min(30, element.value ?? 21));
  return <Group scaleX={element.width / 340} scaleY={element.height / 96}>
    <Card width={340} height={96} />
    <Label x={20} y={17} text={element.text.toUpperCase()} size={9} color={muted} bold />
    <Label x={20} y={43} text="✣" size={28} color="#8bb7ff" />
    <Label x={58} y={47} text="AUTO" size={10} color="#8bb7ff" />
    <Label x={59} y={63} text="Comfort on" size={8} color={muted} />
    <Label x={145} y={41} width={95} text={`${value}°`} size={34} align="center" />
    <Control x={123} y={59} size={29} text="−" enabled={preview} onPress={() => onUpdate(element.id, { value: Math.max(16, value - 0.5) })} />
    <Control x={263} y={59} size={29} text="+" enabled={preview} onPress={() => onUpdate(element.id, { value: Math.min(30, value + 0.5) })} />
    <Label x={295} y={51} text="°C" size={11} color={muted} />
    <Line points={[22, 86, 318, 86]} stroke="#293c56" strokeWidth={2} />
    <Line points={[22, 86, 22 + (value - 16) / 14 * 296, 86]} stroke={blue} strokeWidth={2} />
  </Group>;
}

export function SceneWidget(props: WidgetProps) {
  const { element, preview, onUpdate } = props;
  switch (element.type) {
    case "map": return <MapWidget {...props} />;
    case "music":
    case "music-player": return <MusicWidget {...props} />;
    case "volume": return <VolumeWidget {...props} />;
    case "climate": return <ClimateWidget {...props} />;
    case "button": {
      const active = element.active ?? false;
      const toggle = () => { if (preview) onUpdate(element.id, { active: !active }); };
      return <Group scaleX={element.width / 210} scaleY={element.height / 64} onClick={toggle} onTap={toggle}>
        <Rect width={210} height={64} cornerRadius={14} stroke={active ? "#6aa5ff" : "#344a67"}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: 210, y: 64 }}
          fillLinearGradientColorStops={active ? [0, "#285bb1", 1, "#194080"] : [0, "#1b2d47", 1, "#13223a"]} />
        <Label x={17} y={22} text="ϟ" size={23} color={active ? "#c6dfff" : blue} />
        <Label x={44} y={19} width={119} text={element.text} size={13} bold />
        <Label x={44} y={38} text={active ? "ENABLED" : "STANDBY"} size={7} color={active ? "#c1d9ff" : muted} />
        <Rect x={169} y={25} width={27} height={15} cornerRadius={8} fill={active ? "#8abaff" : "#344762"} listening={false} />
        <Circle x={active ? 188 : 177} y={32.5} radius={5} fill={active ? "#fff" : "#8c9eb9"} listening={false} />
      </Group>;
    }
    default: return <ElementShape element={element} isSelected={false} />;
  }
}
