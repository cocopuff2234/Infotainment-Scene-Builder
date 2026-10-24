import { Fragment } from "react";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

import type { SceneElement } from "../types/scene";

type SceneCanvasProps = {
  elements: SceneElement[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
};

const CANVAS_WIDTH = 820;
const CANVAS_HEIGHT = 560;

export function SceneCanvas({
  elements,
  selectedId,
  onSelect,
  onMove,
}: SceneCanvasProps) {
  function clearSelection(event: any) {
    if (event.target === event.target.getStage()) {
      onSelect("");
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

      <div className="canvas-wrap">
        <Stage
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
                    <Rect
                      width={element.width}
                      height={element.height}
                      fill="#2563eb"
                      cornerRadius={10}
                      stroke={
                        isSelected ? "#93c5fd" : undefined
                      }
                      strokeWidth={isSelected ? 3 : 0}
                    />

                    <Text
                      y={22}
                      width={element.width}
                      text={element.text}
                      align="center"
                      fontSize={16}
                      fontFamily="Inter, sans-serif"
                      fill="#ffffff"
                      listening={false}
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
