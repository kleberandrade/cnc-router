import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";
import type Konva from "konva";
import { useProjectStore, generateShapeId } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { validateProject, shapeIssueLevel } from "../lib/validate";
import { boundingBox } from "../lib/geometry";
import { gridStepFor, fitScale, clampShapeToTable, RULER, PADDING } from "../lib/editorMath";
import type { RectangleShape, CircleShape, PathShape, Shape } from "../types";


const COLORS = {
  table: "#ffffff",
  tableBorder: "#16202b",
  gridMinor: "#eeeeeb",
  gridMajor: "#d8d8d3",
  stock: "rgba(214, 178, 128, 0.35)",
  stockBorder: "#b0854a",
  origin: "#b5601f",
  shape: "#16202b",
  selected: "#2f6d8f",
  warning: "#c98a2b",
  error: "#b3261e",
  fill: "rgba(47,109,143,0.08)",
};

export function Editor() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedId = useProjectStore((s) => s.selectedId);
  const settings = useProjectStore((s) => s.settings);
  const select = useProjectStore((s) => s.select);
  const updateShape = useProjectStore((s) => s.updateShape);

  const addShape = useProjectStore((s) => s.addShape);
  const zoom = useUiStore((s) => s.zoom);
  const setZoom = useUiStore((s) => s.setZoom);
  const pan = useUiStore((s) => s.pan);
  const setPan = useUiStore((s) => s.setPan);
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const draft = useUiStore((s) => s.draft);
  const setDraft = useUiStore((s) => s.setDraft);
  const setSection = useUiStore((s) => s.setSection);

  const { workArea, stock } = settings;
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 800, h: 560 });
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = fitScale(viewport.w, viewport.h, workArea.width, workArea.height) * zoom;
  const stageW = viewport.w;
  const stageH = viewport.h;
  const ox = RULER + PADDING + pan.x; // px origin of the table (left)
  const oy = PADDING + pan.y; // px origin of the table (top)
  const tablePxH = workArea.height * scale;

  // Space held → pan mode (drag the canvas)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) setSpaceDown(true);
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpaceDown(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Enter closes the polygon being drawn
  useEffect(() => {
    if (tool !== "polygon") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); finishPolygon(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, draft, stock.thickness]);

  const finishPolygon = () => {
    if (draft.length >= 3) {
      addShape({
        id: generateShapeId("poly"),
        kind: "path",
        points: draft,
        closed: true,
        depth: stock.thickness,
        operation: "outline",
        side: "outside",
      });
      setSection("shape");
    }
    setTool("select");
  };

  // Table coordinates: X to the right, Y "forward" (towards the back of the machine) — drawn as screen-up.
  const toPx = (x: number, y: number): [number, number] => [ox + x * scale, oy + tablePxH - y * scale];
  const fromPx = (px: number, py: number): [number, number] => [(px - ox) / scale, (oy + tablePxH - py) / scale];

  const issues = useMemo(() => validateProject(shapes, settings), [shapes, settings]);
  const grid = gridStepFor(scale);

  const strokeFor = (shape: Shape) => {
    const level = shapeIssueLevel(issues, shape.id);
    if (level === "error") return COLORS.error;
    if (level === "warning") return COLORS.warning;
    return shape.id === selectedId ? COLORS.selected : COLORS.shape;
  };

  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= workArea.width + 1e-9; x += grid.minor) {
    const isMajor = Math.round(x) % grid.major === 0;
    const [px] = toPx(x, 0);
    gridLines.push(
      <Line
        key={`gx-${x}`}
        points={[px, oy, px, oy + tablePxH]}
        stroke={isMajor ? COLORS.gridMajor : COLORS.gridMinor}
        strokeWidth={1}
        listening={false}
      />
    );
    if (isMajor) {
      gridLines.push(
        <Text
          key={`tx-${x}`}
          x={px - 14}
          y={oy + tablePxH + 4}
          width={28}
          align="center"
          text={String(x)}
          fontSize={9}
          fill="#6b7280"
          listening={false}
        />
      );
    }
  }
  for (let y = 0; y <= workArea.height + 1e-9; y += grid.minor) {
    const isMajor = Math.round(y) % grid.major === 0;
    const [, py] = toPx(0, y);
    gridLines.push(
      <Line
        key={`gy-${y}`}
        points={[ox, py, ox + workArea.width * scale, py]}
        stroke={isMajor ? COLORS.gridMajor : COLORS.gridMinor}
        strokeWidth={1}
        listening={false}
      />
    );
    if (isMajor) {
      gridLines.push(
        <Text
          key={`ty-${y}`}
          x={0}
          y={py - 5}
          width={RULER + PADDING - 4}
          align="right"
          text={String(y)}
          fontSize={9}
          fill="#6b7280"
          listening={false}
        />
      );
    }
  }

  const [stockPxX, stockPxY] = toPx(stock.offsetX, stock.offsetY + stock.height);
  const [originPxX, originPxY] =
    stock.origin === "center"
      ? toPx(stock.offsetX + stock.width / 2, stock.offsetY + stock.height / 2)
      : toPx(stock.offsetX, stock.offsetY);

  const dragBound = (shape: Shape) => (pos: { x: number; y: number }) => {
    // pos is the Konva node position in px (anchor: rect top-left corner in *screen* space or circle center)
    if (shape.kind === "rectangle") {
      // Konva node position is the rectangle centre (offset = half size) so rotation is about the centre.
      const [mmCx, mmCy] = fromPx(pos.x, pos.y);
      const [cx, cy] = clampShapeToTable(shape, mmCx - shape.width / 2, mmCy - shape.height / 2, workArea.width, workArea.height);
      const [px, py] = toPx(cx + shape.width / 2, cy + shape.height / 2);
      return { x: px, y: py };
    }
    if (shape.kind === "circle") {
      const [mmX, mmY] = fromPx(pos.x, pos.y);
      const [cx, cy] = clampShapeToTable(shape, mmX, mmY, workArea.width, workArea.height);
      const [px, py] = toPx(cx, cy);
      return { x: px, y: py };
    }
    // path: node position is a px translation from its original place
    const p = shape as PathShape;
    const b = boundingBox(p.points);
    const dxMm = pos.x / scale;
    const dyMm = -pos.y / scale;
    const [cx, cy] = clampShapeToTable(p, b.minX + dxMm, b.minY + dyMm, workArea.width, workArea.height);
    return { x: (cx - b.minX) * scale, y: -(cy - b.minY) * scale };
  };

  return (
    <div className="editor-canvas" data-testid="editor-canvas" ref={containerRef}>
      <Stage
        width={stageW}
        height={stageH}
        style={{ cursor: spaceDown ? "grab" : tool === "polygon" ? "crosshair" : "default" }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
          setZoom(zoom * factor);
        }}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          const pos = stage?.getPointerPosition();
          if (spaceDown || e.evt.button === 1) {
            if (pos) panStart.current = { x: pan.x, y: pan.y, px: pos.x, py: pos.y };
            return;
          }
          const onBackground = e.target === stage || e.target.name() === "table";
          if (tool === "polygon" && pos) {
            if (e.evt.detail >= 2) { finishPolygon(); return; }
            const [mx, my] = fromPx(pos.x, pos.y);
            const clampedX = Math.min(Math.max(mx, 0), workArea.width);
            const clampedY = Math.min(Math.max(my, 0), workArea.height);
            setDraft([...draft, [Math.round(clampedX * 10) / 10, Math.round(clampedY * 10) / 10]]);
            return;
          }
          if (onBackground) select(null);
        }}
        onMouseMove={(e) => {
          const pos = e.target.getStage()?.getPointerPosition();
          if (!pos) return;
          if (panStart.current) {
            const p = panStart.current;
            setPan({ x: p.x + (pos.x - p.px), y: p.y + (pos.y - p.py) });
            return;
          }
          if (tool === "polygon") setHover(fromPx(pos.x, pos.y));
        }}
        onMouseUp={() => { panStart.current = null; }}
        onMouseLeave={() => { panStart.current = null; setHover(null); }}
      >
        <Layer>
          {/* table */}
          <Rect
            name="table"
            x={ox}
            y={oy}
            width={workArea.width * scale}
            height={tablePxH}
            fill={COLORS.table}
            stroke={COLORS.tableBorder}
            strokeWidth={1.5}
          />
          {gridLines}

          {/* stock */}
          <Rect
            x={stockPxX}
            y={stockPxY}
            width={stock.width * scale}
            height={stock.height * scale}
            fill={COLORS.stock}
            stroke={COLORS.stockBorder}
            strokeWidth={1}
            dash={[6, 3]}
            listening={false}
            name="stock"
          />

          {/* work origin */}
          <Group listening={false}>
            <Line points={[originPxX - 8, originPxY, originPxX + 8, originPxY]} stroke={COLORS.origin} strokeWidth={1.5} />
            <Line points={[originPxX, originPxY - 8, originPxX, originPxY + 8]} stroke={COLORS.origin} strokeWidth={1.5} />
            <Text x={originPxX + 6} y={originPxY - 14} text="0,0" fontSize={10} fill={COLORS.origin} />
          </Group>

          {shapes.map((shape) => {
            const isSelected = shape.id === selectedId;
            const stroke = strokeFor(shape);
            const strokeWidth = isSelected ? 2.5 : 1.5;

            if (shape.kind === "rectangle") {
              const r = shape as RectangleShape;
              const [px, py] = toPx(r.x + r.width / 2, r.y + r.height / 2);
              return (
                <Rect
                  key={r.id}
                  x={px}
                  y={py}
                  offsetX={(r.width * scale) / 2}
                  offsetY={(r.height * scale) / 2}
                  width={r.width * scale}
                  height={r.height * scale}
                  rotation={-r.rotation}
                  fill={COLORS.fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  draggable={!spaceDown && tool === "select"}
                  dragBoundFunc={dragBound(r)}
                  onClick={() => select(r.id)}
                  onTap={() => select(r.id)}
                  onDragStart={() => select(r.id)}
                  onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                    const [mcx, mcy] = fromPx(e.target.x(), e.target.y());
                    updateShape(r.id, { x: mcx - r.width / 2, y: mcy - r.height / 2 });
                  }}
                />
              );
            }

            if (shape.kind === "circle") {
              const c = shape as CircleShape;
              const [px, py] = toPx(c.x, c.y);
              return (
                <Circle
                  key={c.id}
                  x={px}
                  y={py}
                  radius={c.radius * scale}
                  fill={COLORS.fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  draggable={!spaceDown && tool === "select"}
                  dragBoundFunc={dragBound(c)}
                  onClick={() => select(c.id)}
                  onTap={() => select(c.id)}
                  onDragStart={() => select(c.id)}
                  onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                    const [mx, my] = fromPx(e.target.x(), e.target.y());
                    updateShape(c.id, { x: mx, y: my });
                  }}
                />
              );
            }

            const p = shape as PathShape;
            const flatPoints = p.points.flatMap(([x, y]) => toPx(x, y));
            return (
              <Line
                key={p.id}
                x={0}
                y={0}
                points={flatPoints}
                closed={p.closed}
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill={p.closed ? COLORS.fill : undefined}
                draggable={!spaceDown && tool === "select"}
                dragBoundFunc={dragBound(p)}
                onClick={() => select(p.id)}
                onTap={() => select(p.id)}
                onDragStart={() => select(p.id)}
                onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                  const dx = e.target.x() / scale;
                  const dy = -e.target.y() / scale;
                  e.target.position({ x: 0, y: 0 });
                  updateShape(p.id, {
                    points: p.points.map(([x, y]) => [x + dx, y + dy] as [number, number]),
                  });
                }}
              />
            );
          })}

          {tool === "polygon" && draft.length > 0 && (
            <Group listening={false}>
              <Line
                points={[...draft, ...(hover ? [hover] : [])].flatMap(([x, y]) => toPx(x, y))}
                stroke={COLORS.selected}
                strokeWidth={1.5}
                dash={[6, 4]}
              />
              {draft.map(([x, y], i) => {
                const [px, py] = toPx(x, y);
                return <Circle key={i} x={px} y={py} radius={3.5} fill={i === 0 ? COLORS.origin : COLORS.selected} />;
              })}
            </Group>
          )}
        </Layer>
      </Stage>
      {tool === "polygon" && (
        <div className="editor-hint" data-testid="polygon-hint">
          Polígono: clique para adicionar vértices ({draft.length}) · Enter ou duplo clique fecha · Esc cancela
        </div>
      )}
      <div className="editor-caption">
        Mesa {workArea.width} × {workArea.height} mm · Chapa {stock.width} × {stock.height} × {stock.thickness} mm ·{" "}
        {scale.toFixed(2)} px/mm · zoom {Math.round(zoom * 100)}% · roda = zoom, espaço+arrastar = mover
      </div>
    </div>
  );
}
