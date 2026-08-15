import { Stage, Layer, Rect, Circle, Line } from "react-konva";
import type Konva from "konva";
import { useProjectStore } from "../state/store";
import type { RectangleShape, CircleShape, PathShape } from "../types";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const SCALE = 3; // px per mm

export function Editor() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedId = useProjectStore((s) => s.selectedId);
  const select = useProjectStore((s) => s.select);
  const updateShape = useProjectStore((s) => s.updateShape);

  return (
    <div className="editor-canvas" data-testid="editor-canvas">
      <Stage
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) select(null);
        }}
      >
        <Layer>
          {/* grid */}
          {Array.from({ length: Math.floor(CANVAS_WIDTH / SCALE / 10) + 1 }).map(
            (_, i) => (
              <Line
                key={`v-${i}`}
                points={[i * 10 * SCALE, 0, i * 10 * SCALE, CANVAS_HEIGHT]}
                stroke="#e2e2df"
                strokeWidth={1}
              />
            )
          )}
          {Array.from({ length: Math.floor(CANVAS_HEIGHT / SCALE / 10) + 1 }).map(
            (_, i) => (
              <Line
                key={`h-${i}`}
                points={[0, i * 10 * SCALE, CANVAS_WIDTH, i * 10 * SCALE]}
                stroke="#e2e2df"
                strokeWidth={1}
              />
            )
          )}

          {shapes.map((shape) => {
            const isSelected = shape.id === selectedId;
            const stroke = isSelected ? "#2f6d8f" : "#16202b";
            const strokeWidth = isSelected ? 2.5 : 1.5;

            if (shape.kind === "rectangle") {
              const r = shape as RectangleShape;
              return (
                <Rect
                  key={r.id}
                  x={r.x * SCALE}
                  y={r.y * SCALE}
                  width={r.width * SCALE}
                  height={r.height * SCALE}
                  rotation={r.rotation}
                  fill="rgba(47,109,143,0.08)"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  draggable
                  onClick={() => select(r.id)}
                  onTap={() => select(r.id)}
                  onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
                    updateShape(r.id, {
                      x: e.target.x() / SCALE,
                      y: e.target.y() / SCALE,
                    })
                  }
                />
              );
            }

            if (shape.kind === "circle") {
              const c = shape as CircleShape;
              return (
                <Circle
                  key={c.id}
                  x={c.x * SCALE}
                  y={c.y * SCALE}
                  radius={c.radius * SCALE}
                  fill="rgba(47,109,143,0.08)"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  draggable
                  onClick={() => select(c.id)}
                  onTap={() => select(c.id)}
                  onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) =>
                    updateShape(c.id, {
                      x: e.target.x() / SCALE,
                      y: e.target.y() / SCALE,
                    })
                  }
                />
              );
            }

            const p = shape as PathShape;
            const flatPoints = p.points.flatMap(([x, y]) => [
              x * SCALE,
              y * SCALE,
            ]);
            return (
              <Line
                key={p.id}
                points={flatPoints}
                closed={p.closed}
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill="rgba(47,109,143,0.08)"
                onClick={() => select(p.id)}
                onTap={() => select(p.id)}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
