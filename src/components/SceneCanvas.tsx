import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import type { KonvaEventObject } from "konva/lib/Node";
import { CANVAS_HEIGHT, CANVAS_WIDTH, type AssetType, type Scene, type SceneBackground, type SceneElement } from "../types/scene";
import { ASSET_DRAG_MIME, isAssetType } from "../data/assets";
import { SceneWidget } from "./SceneWidgets";
import { useAuth } from "../services/useAuth";
import { SceneImage } from "./SceneImage";

type SceneCanvasProps = {
  elements: SceneElement[];
  background?: SceneBackground;
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onUpdate: (id: string, patch: Partial<SceneElement>) => void;
  onDropAsset: (type: AssetType, x: number, y: number) => void;
  scenes: Scene[];
  currentSceneId: string;
  startSceneId: string;
  onSceneChange: (sceneId: string) => void;
  onAddScene: () => void;
  onRenameScene: () => void;
  onDeleteScene: () => void;
  onSetStartScene: () => void;
  onNavigate: (targetSceneId: string) => void;
  canAddScene: boolean;
  preview: boolean;
};

const font = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const clamp = (value: number, max: number) => Math.max(0, Math.min(Math.max(0, max), value));
// Keeping the upper bound on the grid prevents a last-pixel jump after a bounded drag.
const snap = (value: number, max: number) => clamp(Math.round(value / 8) * 8, Math.floor(Math.max(0, max) / 8) * 8);

export function SceneCanvas({ elements, background, selectedId, onSelect, onMove, onUpdate, onDropAsset, scenes, currentSceneId, startSceneId, onSceneChange, onAddScene, onRenameScene, onDeleteScene, onSetStartScene, onNavigate, canAddScene, preview }: SceneCanvasProps) {
  const { session, loading: authLoading } = useAuth();
  const greeting = authLoading ? "Good morning" : `Good morning, ${session?.name || "Guest"}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<KonvaStage>(null);
  const elementRefs = useRef(new Map<string, KonvaGroup>());
  const transformerRef = useRef<KonvaTransformer>(null);
  const [availableWidth, setAvailableWidth] = useState(CANVAS_WIDTH + 18);
  const scale = Math.max(0.001, Math.min(1, (availableWidth - 18) / CANVAS_WIDTH));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = !preview ? elementRefs.current.get(selectedId) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.forceUpdate();
  }, [selectedId, elements, preview, scale]);

  function finishResize(element: SceneElement, node: KonvaGroup) {
    const width = Math.max(80, Math.min(CANVAS_WIDTH, Math.round(element.width * node.scaleX())));
    const height = Math.max(48, Math.min(CANVAS_HEIGHT, Math.round(element.height * node.scaleY())));
    const x = clamp(Math.round(node.x()), CANVAS_WIDTH - width);
    const y = clamp(Math.round(node.y()), CANVAS_HEIGHT - height);
    // Store real dimensions rather than accumulated Konva scale, keeping the inspector and export consistent.
    node.scale({ x: 1, y: 1 });
    node.position({ x, y });
    onUpdate(element.id, { x, y, width, height });
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!preview && event.dataTransfer.types.includes(ASSET_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const type = event.dataTransfer.getData(ASSET_DRAG_MIME);
    const stage = stageRef.current;
    if (preview || !stage || !isAssetType(type)) return;
    event.preventDefault();
    stage.setPointersPositions(event.nativeEvent);
    // Invert the responsive stage scale so dropped assets land under the pointer.
    const position = stage.getRelativePointerPosition();
    if (position && position.x >= 0 && position.x <= CANVAS_WIDTH && position.y >= 0 && position.y <= CANVAS_HEIGHT) {
      onDropAsset(type, position.x, position.y);
    }
  }

  function clearSelection(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!preview && event.target === event.target.getStage()) onSelect("");
  }

  function cursor(event: KonvaEventObject<MouseEvent>, value: string) {
    const container = event.target.getStage()?.container();
    if (container) container.style.cursor = value;
  }

  return (
    <section className={`canvas-panel${preview ? " is-preview" : " is-editing"}`} style={{ minWidth: 0 }} aria-label="Infotainment scene canvas">
      <div className="scene-toolbar" style={{ maxWidth: CANVAS_WIDTH }}>
        <div>
          <p className="eyebrow">Live workspace</p>
          <h2>Infotainment display <span className="scene-mode-badge" style={{ marginLeft: 10, color: preview ? "#78dbbb" : "#85b2ff", fontSize: 10, fontWeight: 500 }}>{preview ? "● PREVIEW" : "● EDIT MODE"}</span></h2>
        </div>
        <span className="canvas-size">{CANVAS_WIDTH} × {CANVAS_HEIGHT} <span className="canvas-zoom" style={{ marginLeft: 12 }}>{Math.round(scale * 100)}%</span></span>
      </div>
      <div className="scene-switcher" style={{ maxWidth: CANVAS_WIDTH }}>
        <label>Scene
          <select value={currentSceneId} onChange={(event) => onSceneChange(event.target.value)} disabled={preview}>
            {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}{scene.id === startSceneId ? " · start" : ""}</option>)}
          </select>
        </label>
        <div className="scene-switcher-actions">
          <button type="button" className="secondary-button" onClick={onAddScene} disabled={preview || !canAddScene}>+ Scene</button>
          <button type="button" className="secondary-button" onClick={onRenameScene} disabled={preview}>Rename</button>
          <button type="button" className="secondary-button" onClick={onSetStartScene} disabled={preview || currentSceneId === startSceneId}>{currentSceneId === startSceneId ? "Start scene" : "Set as start"}</button>
          <button type="button" className="secondary-button scene-delete-button" onClick={onDeleteScene} disabled={preview || scenes.length <= 1}>Delete</button>
        </div>
      </div>

      <div className="canvas-viewport" ref={containerRef} style={{ width: "100%", maxWidth: CANVAS_WIDTH + 18, margin: "0 auto" }}>
        <div className="canvas-wrap" onDragOver={handleDragOver} onDrop={handleDrop} style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 18, background: "#080f1d", boxShadow: "0 24px 70px #00000035" }}>
          <Stage ref={stageRef} width={CANVAS_WIDTH * scale} height={CANVAS_HEIGHT * scale}
            scaleX={scale} scaleY={scale}
            onMouseDown={clearSelection} onTouchStart={clearSelection}>
            <Layer>
              <Group listening={false}>
                {background ? <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} cornerRadius={12} fill={background.color} /> : <>
                  <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} cornerRadius={12}
                    fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: 850, y: 620 }}
                    fillLinearGradientColorStops={[0, "#13233b", 0.55, "#0b1628", 1, "#080f1e"]} />
                  <Circle x={780} y={240} radius={300} fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={300}
                    fillRadialGradientColorStops={[0, "#24509a18", 1, "#24509a00"]} />
                </>}
                {background?.image && <>
                  <SceneImage src={background.image} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fit={background.fit ?? "cover"} />
                  <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#000000" opacity={background.overlay ?? 0.25} listening={false} />
                </>}
                <Text x={30} y={25} text="YOUR SPACE. YOUR DRIVE." fontFamily={font} fontSize={8} letterSpacing={1.3} fill="#7d91af" />
                <Circle x={750} y={30} radius={3} fill="#78dbbb" />
                <Text x={762} y={25} text="CONNECTED" fontFamily={font} fontSize={8} fill="#92a6c1" />
                <Text x={860} y={23} text="22°  ☀" fontFamily={font} fontSize={12} fill="#b4c4da" />
                <Text x={932} y={23} text="09:41" fontFamily={font} fontSize={13} fontStyle="bold" fill="#e7efff" />
                <Line points={[28, 52, 972, 52]} stroke="#25344d" strokeWidth={1} />
                <Text x={30} y={76} width={940} height={32} wrap="none" ellipsis text={greeting} fontFamily={font} fontSize={26} fontStyle="bold" fill="#eef4ff" />
                <Text x={31} y={112} text="A little more connected. A little further ahead." fontFamily={font} fontSize={11} fill="#8194b2" />
                <Line points={[28, 572, 972, 572]} stroke="#25344d" />
                <Rect x={30} y={584} width={76} height={26} cornerRadius={8} fill="#223b61" />
                <Text x={30} y={592} width={76} align="center" text="⌂  Home" fontFamily={font} fontSize={10} fill="#9dc3ff" />
                <Text x={131} y={592} text="◇  Navigate" fontFamily={font} fontSize={10} fill="#7186a6" />
                <Text x={244} y={592} text="♫  Media" fontFamily={font} fontSize={10} fill="#7186a6" />
                <Text x={340} y={592} text="✣  Climate" fontFamily={font} fontSize={10} fill="#7186a6" />
                <Text x={811} y={592} width={160} align="right" text="P  ·  All systems ready" fontFamily={font} fontSize={10} fill="#7186a6" />
              </Group>

              {elements.map((element) => {
                return <Group key={element.id}
                  ref={(node) => { if (node) elementRefs.current.set(element.id, node); else elementRefs.current.delete(element.id); }}
                  x={element.x} y={element.y} width={element.width} height={element.height} draggable={!preview}
                  onTransformEnd={() => {
                    const node = elementRefs.current.get(element.id);
                    if (node) finishResize(element, node);
                  }}
                  onClick={() => { if (preview) { if (element.action) onNavigate(element.action.targetSceneId); } else onSelect(element.id); }}
                  onTap={() => { if (preview) { if (element.action) onNavigate(element.action.targetSceneId); } else onSelect(element.id); }}
                  onMouseEnter={(event) => cursor(event, preview ? (element.action || element.type !== "map" ? "pointer" : "default") : "grab")}
                  onMouseLeave={(event) => cursor(event, "default")}
                  onDragStart={() => onSelect(element.id)}
                  onDragMove={(event) => {
                    const node = event.currentTarget;
                    node.position({ x: clamp(node.x(), CANVAS_WIDTH - element.width), y: clamp(node.y(), CANVAS_HEIGHT - element.height) });
                  }}
                  onDragEnd={(event) => {
                    const x = snap(event.currentTarget.x(), CANVAS_WIDTH - element.width);
                    const y = snap(event.currentTarget.y(), CANVAS_HEIGHT - element.height);
                    event.currentTarget.position({ x, y });
                    onMove(element.id, x, y);
                  }}>
                  <SceneWidget element={element} preview={preview} onUpdate={onUpdate} />

                </Group>;
              })}
              {!preview && <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                flipEnabled={false}
                keepRatio
                ignoreStroke
                anchorSize={9}
                anchorCornerRadius={2}
                anchorFill="#e3efff"
                anchorStroke="#5795ff"
                borderStroke="#75aaff"
                borderStrokeWidth={1.5}
                padding={0}
                enabledAnchors={["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]}
                boundBoxFunc={(oldBox, newBox) => {
                  // Transformer boxes are in absolute coordinates, including the responsive stage scale.
                  const epsilon = 0.01;
                  if (newBox.width < 80 * scale || newBox.height < 48 * scale
                    || newBox.x < -epsilon || newBox.y < -epsilon
                    || newBox.x + newBox.width > CANVAS_WIDTH * scale + epsilon
                    || newBox.y + newBox.height > CANVAS_HEIGHT * scale + epsilon) return oldBox;
                  return newBox;
                }}
              />}
            </Layer>
          </Stage>
        </div>
      </div>
      <div className="canvas-footer" style={{ maxWidth: CANVAS_WIDTH, margin: "14px auto 0", display: "flex", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
        <p className="canvas-helper hint" style={{ margin: 0 }}>
          {preview ? "Live preview · Buttons with navigation actions switch scenes without changing the saved design." : "Drag to arrange · Corners scale proportionally · Side handles stretch · Click empty space to deselect"}
        </p>
        <span className="canvas-element-count" style={{ fontSize: 10, color: "#64748b" }}>{elements.length} component{elements.length === 1 ? "" : "s"}</span>
      </div>
    </section>
  );
}
