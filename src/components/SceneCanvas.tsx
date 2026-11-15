import { Fragment, useRef } from "react";
import type { DragEvent } from "react";
import type Konva from "konva";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../config/project";
import { ASSET_DRAG_MIME, isAssetType } from "../data/assets";
import type { AssetType, SceneElement } from "../types/scene";
import { ElementShape } from "./ElementShape";

type SceneCanvasProps = {
  elements: SceneElement[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDropAsset: (type: AssetType, x: number, y: number) => void;
};

const CANVAS_WIDTH = SCREEN_WIDTH;
const CANVAS_HEIGHT = SCREEN_HEIGHT;

export function SceneCanvas({
  elements,
  selectedId,
  onSelect,
  onMove,
  onDropAsset,
}: SceneCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);

  function clearSelection(event: any) {
    if (event.target === event.target.getStage()) {
      onSelect("");
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (event.dataTransfer.types.includes(ASSET_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const type = event.dataTransfer.getData(ASSET_DRAG_MIME);
    const stage = stageRef.current;

    if (!stage || !isAssetType(type)) {
      return;
    }

    event.preventDefault();

    // Converts the browser event position into canvas coordinates.
    stage.setPointersPositions(event.nativeEvent);
    const position = stage.getPointerPosition();

    if (position) {
      onDropAsset(type, position.x, position.y);
    }
  }

  return (
    <section className="canvas-panel">
      <div className="scene-toolbar">
        <div>
          <p className="eyebrow">Current scene</p>
          <h2>Home</h2>
        </div>

        <span className="canvas-size">
          {CANVAS_WIDTH} × {CANVAS_HEIGHT}
        </span>
      </div>

      <div
        className="canvas-wrap"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={clearSelection}
        >
          <Layer>
            <Rect
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fill="#111827"
              cornerRadius={4}
            />

            <Text
              x={28}
              y={24}
              text="Home"
              fontSize={18}
              fontFamily="Inter, sans-serif"
              fill="#94a3b8"
            />

            {elements.map((element) => {
              const isSelected = element.id === selectedId;

              return (
                <Fragment key={element.id}>
                  <Group
                    x={element.x}
                    y={element.y}
                    draggable
                    onClick={() => onSelect(element.id)}
                    onTap={() => onSelect(element.id)}
                    onDragEnd={(event) =>
                      onMove(
                        element.id,
                        event.target.x(),
                        event.target.y(),
                      )
                    }
                  >
                    <ElementShape
                      element={element}
                      isSelected={isSelected}
                    />
                  </Group>
                </Fragment>
              );
            })}
          </Layer>
        </Stage>
      </div>
    </section>
  );
}
