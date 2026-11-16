import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group, Transformer, Image as KonvaImage } from "react-konva";
import { reliefGrid } from "../lib/relief";
import type { ReliefShape, MachineSettings } from "../types";
import type Konva from "konva";
import { useProjectStore, generateShapeId, translateShape } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { shapeIssueLevel } from "../lib/validate";
import { boundingBox, shapeToPoints, rotatePoint } from "../lib/geometry";
import { gridStepFor, fitScale, RULER, PADDING, snapBox, buildSnapTargets } from "../lib/editorMath";
import { InlineDimensions } from "./InlineDimensions";
import { useTheme } from "../hooks/useTheme";
import { textToPolygons } from "../lib/text";
import type { Shape } from "../types";
import { originPoint } from "../lib/toolpath";
import { useDerived } from "../state/derived";
import type { Point } from "../lib/geometry";

const LIGHT = {
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
  guide: "#e0479a",
  marquee: "rgba(47,109,143,0.12)",
  ruler: "#6b7280",
};
const DARK = {
  ...LIGHT,
  table: "#1d2936",
  tableBorder: "#7fb0d8",
  gridMinor: "#233140",
  gridMajor: "#2f4052",
  stock: "rgba(214, 178, 128, 0.22)",
  stockBorder: "#d6b280",
  origin: "#e0a05a",
  shape: "#e6ebf1",
  selected: "#8fc0e6",
  fill: "rgba(143,192,230,0.12)",
  marquee: "rgba(143,192,230,0.15)",
  ruler: "#94a3b8",
};

/** Background props exclude selection/parts so editing cannot invalidate the static canvas. */
interface BackgroundProps {
  workArea: MachineSettings["workArea"];
  stock: MachineSettings["stock"];
  scale: number;
  ox: number;
  oy: number;
  colors: typeof LIGHT;
  toPx: (x: number, y: number) => Point;
}

const EditorBackground = memo(function EditorBackground({ workArea, stock, scale, ox, oy, colors: COLORS, toPx }: BackgroundProps) {
  const grid = gridStepFor(scale);
  const tablePxH = workArea.height * scale;
  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= workArea.width + 1e-9; x += grid.minor) {
    const isMajor = Math.round(x) % grid.major === 0;
    const [px] = toPx(x, 0);
    gridLines.push(<Line key={`gx-${x}`} points={[px, oy, px, oy + tablePxH]} stroke={isMajor ? COLORS.gridMajor : COLORS.gridMinor} strokeWidth={1} listening={false} />);
    if (isMajor) gridLines.push(<Text key={`tx-${x}`} x={px - 14} y={oy + tablePxH + 4} width={28} align="center" text={String(x)} fontSize={9} fill={COLORS.ruler} listening={false} />);
  }
  for (let y = 0; y <= workArea.height + 1e-9; y += grid.minor) {
    const isMajor = Math.round(y) % grid.major === 0;
    const [, py] = toPx(0, y);
    gridLines.push(<Line key={`gy-${y}`} points={[ox, py, ox + workArea.width * scale, py]} stroke={isMajor ? COLORS.gridMajor : COLORS.gridMinor} strokeWidth={1} listening={false} />);
    if (isMajor) gridLines.push(<Text key={`ty-${y}`} x={0} y={py - 5} width={RULER + PADDING - 4} align="right" text={String(y)} fontSize={9} fill={COLORS.ruler} listening={false} />);
  }

  const [stockPxX, stockPxY] = toPx(stock.offsetX, stock.offsetY + stock.height);
  const [originPxX, originPxY] = toPx(...originPoint(stock));
  return (
    <Layer listening={false}>
      <Rect name="table" x={ox} y={oy} width={workArea.width * scale} height={tablePxH} fill={COLORS.table} stroke={COLORS.tableBorder} strokeWidth={1.5} />
      {gridLines}
      <Rect x={stockPxX} y={stockPxY} width={stock.width * scale} height={stock.height * scale} fill={COLORS.stock} stroke={COLORS.stockBorder} strokeWidth={1} dash={[6, 3]} name="stock" />
      <Group>
        <Line points={[originPxX - 8, originPxY, originPxX + 8, originPxY]} stroke={COLORS.origin} strokeWidth={1.5} />
        <Line points={[originPxX, originPxY - 8, originPxX, originPxY + 8]} stroke={COLORS.origin} strokeWidth={1.5} />
        <Text x={originPxX + 6} y={originPxY - 14} text="0,0" fontSize={10} fill={COLORS.origin} />
      </Group>
    </Layer>
  );
});

/** Centre (mm) used as the Konva node position for a shape. */
function shapeCenter(shape: Shape): Point {
  switch (shape.kind) {
    case "rectangle": return [shape.x + shape.width / 2, shape.y + shape.height / 2];
    case "circle": case "ngon": case "slot": return [shape.x, shape.y];
    case "text": {
      const pts = shapeToPoints(shape);
      if (!pts.length) return [shape.x, shape.y];
      const b = boundingBox(pts);
      return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
    }
    case "relief":
      return [shape.x + shape.width / 2, shape.y + shape.height / 2];
    default: {
      const b = boundingBox(shape.points);
      return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
    }
  }
}

/** Outline points relative to the centre, WITHOUT the shape's own rotation (Konva rotates the node). */
/** Grayscale canvas of a relief (cached by data). */
const reliefCache = new Map<string, HTMLCanvasElement>();
function reliefCanvas(shape: ReliefShape): HTMLCanvasElement | undefined {
  if (typeof document === "undefined") return undefined;
  const key = `${shape.cols}x${shape.rows}:${shape.invert ? 1 : 0}:${shape.data.length}:${shape.data.slice(0, 64)}`;
  let c = reliefCache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = shape.cols; c.height = shape.rows;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const g = reliefGrid(shape);
  const img = ctx.createImageData(shape.cols, shape.rows);
  for (let i = 0; i < g.length; i++) { const v = shape.invert ? 255 - g[i] : g[i]; img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  if (reliefCache.size > 20) reliefCache.delete(reliefCache.keys().next().value!);
  reliefCache.set(key, c);
  return c;
}

function localPoints(shape: Shape): Point[] {
  const [cx, cy] = shapeCenter(shape);
  const unrotated: Shape = "rotation" in shape ? ({ ...shape, rotation: 0 } as Shape) : shape;
  return shapeToPoints(unrotated).map(([x, y]) => [x - cx, y - cy]);
}

const shapeRotation = (shape: Shape) => ("rotation" in shape ? shape.rotation || 0 : 0);

/** Anchor point (mm) whose movement equals the shape's movement: centre for all kinds. */
function moveShapeTo(shape: Shape, cx: number, cy: number): Shape {
  const [ox, oy] = shapeCenter(shape);
  return translateShape(shape, cx - ox, cy - oy);
}

export function Editor() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const settings = useProjectStore((s) => s.settings);
  const select = useProjectStore((s) => s.select);
  const toggleSelect = useProjectStore((s) => s.toggleSelect);
  const selectMany = useProjectStore((s) => s.selectMany);
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
  const snap = useUiStore((s) => s.snap);
  useUiStore((s) => s.fontsVersion); // re-render when fonts load (text outlines appear)

  const { workArea, stock } = settings;
  const COLORS = useTheme() === "dark" ? DARK : LIGHT;
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 800, h: 560 });
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [shiftDown, setShiftDown] = useState(false);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number; cx: number; cy: number; pan: { x: number; y: number } } | null>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());
  const trRef = useRef<Konva.Transformer>(null);

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
  if (typeof window !== "undefined") (window as unknown as { __zoom?: number }).__zoom = zoom;
  const stageW = viewport.w;
  const stageH = viewport.h;
  const ox = RULER + PADDING + pan.x;
  const oy = PADDING + pan.y;
  const tablePxH = workArea.height * scale;

  const toPx = useCallback((x: number, y: number): Point => [ox + x * scale, oy + tablePxH - y * scale], [ox, oy, tablePxH, scale]);
  const fromPx = (px: number, py: number): [number, number] => [(px - ox) / scale, (oy + tablePxH - py) / scale];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
      if (e.code === "Space" && !typing) setSpaceDown(true);
      if (e.key === "Shift") setShiftDown(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
      if (e.key === "Shift") setShiftDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (tool !== "polygon") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); finishPolygon(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, draft, stock.thickness]);

  const finishPolygon = () => {
    if (draft.length >= 3) {
      addShape({ id: generateShapeId("poly"), kind: "path", points: draft, closed: true, depth: stock.thickness, operation: "outline", side: "outside" });
      setSection("shape");
    }
    setTool("select");
  };

  // Transformer follows the (single) selection
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const sel = selectedIds.length === 1 ? shapes.find((x) => x.id === selectedIds[0]) : undefined;
    const node = sel && !sel.locked ? nodeRefs.current.get(sel.id) : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, shapes, scale, pan]);

  const issues = useDerived((d) => d.issues);

  const strokeFor = (shape: Shape) => {
    const level = shapeIssueLevel(issues, shape.id);
    if (level === "error") return COLORS.error;
    if (level === "warning") return COLORS.warning;
    return selectedIds.includes(shape.id) ? COLORS.selected : COLORS.shape;
  };

  // ---- drag with clamp + snap (node position = shape centre in px) ----
  const dragBound = (shape: Shape) => (pos: { x: number; y: number }) => {
    const [mmCx, mmCy] = fromPx(pos.x, pos.y);
    const b = boundingBox(shapeToPoints(shape));
    const [cx0, cy0] = shapeCenter(shape);
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    let minX = mmCx - (cx0 - b.minX), minY = mmCy - (cy0 - b.minY);
    let gx: number | null = null, gy: number | null = null;
    if (snap && !shiftDown) {
      const others = shapes.filter((s) => s.id !== shape.id && !selectedIds.includes(s.id)).map((s) => boundingBox(shapeToPoints(s)));
      const targets = buildSnapTargets({ minX: stock.offsetX, minY: stock.offsetY, maxX: stock.offsetX + stock.width, maxY: stock.offsetY + stock.height }, others);
      const r = snapBox(minX, minY, w, h, targets, 6 / scale);
      minX = r.x; minY = r.y; gx = r.guideX; gy = r.guideY;
    }
    // clamp bbox to the table (clampShapeToTable works on the shape's own anchor; convert via bbox min)
    const clampedMinX = Math.min(Math.max(minX, 0), Math.max(workArea.width - w, 0));
    const clampedMinY = Math.min(Math.max(minY, 0), Math.max(workArea.height - h, 0));
    if (clampedMinX !== minX) gx = null;
    if (clampedMinY !== minY) gy = null;
    setGuides((g) => (g.x === gx && g.y === gy ? g : { x: gx, y: gy }));
    const [px, py] = toPx(clampedMinX + (cx0 - b.minX), clampedMinY + (cy0 - b.minY));
    return { x: px, y: py };
  };

  const onDragEnd = (shape: Shape, node: Konva.Node) => {
    const [cx, cy] = fromPx(node.x(), node.y());
    setGuides({ x: null, y: null });
    const moved = moveShapeTo(shape, cx, cy);
    if (shape.kind === "path") updateShape(shape.id, { points: (moved as typeof shape).points });
    else updateShape(shape.id, { x: (moved as { x: number }).x, y: (moved as { y: number }).y } as Partial<Shape>);
  };

  // ---- transform (resize/rotate) ----
  const onTransformEnd = (shape: Shape, node: Konva.Node) => {
    const sx = node.scaleX(), sy = node.scaleY();
    const rot = -node.rotation(); // Konva rotates clockwise on screen; our Y is flipped
    node.scaleX(1); node.scaleY(1);
    const [cx, cy] = fromPx(node.x(), node.y());
    const r2 = (v: number) => Math.round(v * 100) / 100;
    switch (shape.kind) {
      case "rectangle": {
        const width = r2(Math.max(shape.width * sx, 0.1)), height = r2(Math.max(shape.height * sy, 0.1));
        updateShape(shape.id, { width, height, rotation: r2(rot), x: r2(cx - width / 2), y: r2(cy - height / 2) });
        break;
      }
      case "circle": {
        updateShape(shape.id, { radius: r2(Math.max(shape.radius * Math.max(sx, sy), 0.1)), x: r2(cx), y: r2(cy) });
        break;
      }
      case "relief": {
        const width = r2(Math.max(shape.width * sx, 1)), height = r2(Math.max(shape.height * sy, 1));
        updateShape(shape.id, { width, height, x: r2(cx - width / 2), y: r2(cy - height / 2) });
        break;
      }
      case "ngon": {
        updateShape(shape.id, { radius: r2(Math.max(shape.radius * Math.max(sx, sy), 0.1)), rotation: r2(rot), x: r2(cx), y: r2(cy) });
        break;
      }
      case "slot": {
        updateShape(shape.id, { length: r2(Math.max(shape.length * sx, 0.1)), width: r2(Math.max(shape.width * sy, 0.1)), rotation: r2(rot), x: r2(cx), y: r2(cy) });
        break;
      }
      case "text": {
        const k = Math.max(sx, sy);
        const updated = { ...shape, size: r2(Math.max(shape.size * k, 1)), rotation: r2(rot) };
        node.rotation(-updated.rotation);
        const moved = moveShapeTo(updated, cx, cy) as typeof updated;
        updateShape(shape.id, { size: updated.size, rotation: updated.rotation, x: r2(moved.x), y: r2(moved.y) });
        break;
      }
      case "path": {
        const [ocx, ocy] = shapeCenter(shape);
        const dRot = rot - 0; // path has no stored rotation; bake it into points
        const points = shape.points.map(([x, y]) => {
          const lx = (x - ocx) * sx, ly = (y - ocy) * sy;
          const [rx, ry] = rotatePoint([lx, ly], [0, 0], dRot);
          return [r2(cx + rx), r2(cy + ry)] as [number, number];
        });
        node.rotation(0);
        updateShape(shape.id, { points });
        break;
      }
    }
  };

  const clickShape = (shape: Shape, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const shift = "shiftKey" in e.evt && e.evt.shiftKey;
    if (shift) toggleSelect(shape.id);
    else if (!selectedIds.includes(shape.id)) select(shape.id);
    else if (selectedIds.length > 1) select(shape.id);
  };

  const finishMarquee = () => {
    if (!marquee) return;
    const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1);
    const y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
    setMarquee(null);
    if (x1 - x0 < 1 && y1 - y0 < 1) return;
    const hit = shapes.filter((s) => {
      const b = boundingBox(shapeToPoints(s));
      return b.maxX >= x0 && b.minX <= x1 && b.maxY >= y0 && b.minY <= y1;
    }).map((s) => s.id);
    if (shiftDown) selectMany([...new Set([...selectedIds, ...hit])]);
    else selectMany(hit);
    if (hit.length) setSection("shape");
  };

  const selectedShape = selectedIds.length === 1 ? shapes.find((s) => s.id === selectedIds[0]) : undefined;
  const selectedBox = selectedShape ? boundingBox(shapeToPoints(selectedShape)) : null;

  return (
    <div className="editor-canvas" data-testid="editor-canvas" ref={containerRef}>
      <Stage
        width={stageW}
        height={stageH}
        style={{ cursor: spaceDown ? "grab" : tool === "polygon" ? "crosshair" : "default" }}
        onWheel={(e) => { e.evt.preventDefault(); setZoom(zoom * (e.evt.deltaY < 0 ? 1.1 : 1 / 1.1)); }}
        onMouseDown={(e) => {
          const stage = e.target.getStage();
          const pos = stage?.getPointerPosition();
          if (spaceDown || e.evt.button === 1) { if (pos) panStart.current = { x: pan.x, y: pan.y, px: pos.x, py: pos.y }; return; }
          const onBackground = e.target === stage || e.target.name() === "table";
          if (tool === "polygon" && pos) {
            if (e.evt.detail >= 2) { finishPolygon(); return; }
            const [mx, my] = fromPx(pos.x, pos.y);
            setDraft([...draft, [Math.round(Math.min(Math.max(mx, 0), workArea.width) * 10) / 10, Math.round(Math.min(Math.max(my, 0), workArea.height) * 10) / 10]]);
            return;
          }
          if (onBackground && pos) {
            const [mx, my] = fromPx(pos.x, pos.y);
            setMarquee({ x0: mx, y0: my, x1: mx, y1: my });
            if (!e.evt.shiftKey) select(null);
          }
        }}
        onMouseMove={(e) => {
          const pos = e.target.getStage()?.getPointerPosition();
          if (!pos) return;
          if (panStart.current) { const p = panStart.current; setPan({ x: p.x + (pos.x - p.px), y: p.y + (pos.y - p.py) }); return; }
          if (tool === "polygon") setHover(fromPx(pos.x, pos.y));
          if (marquee) { const [mx, my] = fromPx(pos.x, pos.y); setMarquee({ ...marquee, x1: mx, y1: my }); }
        }}
        onMouseUp={() => { panStart.current = null; finishMarquee(); }}
        onMouseLeave={() => { panStart.current = null; setHover(null); setMarquee(null); }}
        onTouchStart={(e) => {
          const t = e.evt.touches;
          if (t.length === 2) {
            e.evt.preventDefault();
            const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
            pinch.current = { dist: Math.hypot(dx, dy), zoom, cx: (t[0].clientX + t[1].clientX) / 2, cy: (t[0].clientY + t[1].clientY) / 2, pan: { ...pan } };
          } else if (tool === "polygon" && t.length === 1) {
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            const onBackground = e.target === stage || e.target.name() === "table";
            if (pos && onBackground) {
              const [mx, my] = fromPx(pos.x, pos.y);
              setDraft([...draft, [Math.round(Math.min(Math.max(mx, 0), workArea.width) * 10) / 10, Math.round(Math.min(Math.max(my, 0), workArea.height) * 10) / 10]]);
            }
          }
        }}
        onTouchMove={(e) => {
          const t = e.evt.touches;
          if (t.length === 2 && pinch.current) {
            e.evt.preventDefault();
            const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
            const dist = Math.hypot(dx, dy);
            const cx = (t[0].clientX + t[1].clientX) / 2, cy = (t[0].clientY + t[1].clientY) / 2;
            const p = pinch.current;
            setZoom(Math.min(Math.max(p.zoom * (dist / Math.max(p.dist, 1)), 0.25), 8));
            setPan({ x: p.pan.x + (cx - p.cx), y: p.pan.y + (cy - p.cy) });
          }
        }}
        onTouchEnd={(e) => { if (e.evt.touches.length < 2) pinch.current = null; }}
      >
        {/* Static background (table, grid, stock, origin) in its own layer: it only redraws on pan/zoom/stock changes, not on every shape edit (Sprint 27). Background clicks hit the Stage. */}
        <EditorBackground workArea={workArea} stock={stock} scale={scale} ox={ox} oy={oy} colors={COLORS} toPx={toPx} />
        <Layer>

          {shapes.map((shape) => {
            const isSelected = selectedIds.includes(shape.id);
            const stroke = strokeFor(shape);
            const strokeWidth = isSelected ? 2.5 : 1.5;
            const [cx, cy] = shapeCenter(shape);
            const [px, py] = toPx(cx, cy);
            const draggable = !spaceDown && tool === "select" && !shape.locked;
            const common = {
              x: px,
              y: py,
              rotation: -shapeRotation(shape),
              fill: COLORS.fill,
              stroke,
              strokeWidth,
              opacity: shape.hidden ? 0.3 : 1,
              dash: shape.hidden ? [4, 4] : undefined,
              draggable,
              dragBoundFunc: dragBound(shape),
              onClick: (e: Konva.KonvaEventObject<MouseEvent>) => clickShape(shape, e),
              onTap: (e: Konva.KonvaEventObject<TouchEvent>) => clickShape(shape, e),
              onDragStart: () => { if (!selectedIds.includes(shape.id)) select(shape.id); },
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(shape, e.target),
              onTransformEnd: (e: Konva.KonvaEventObject<Event>) => onTransformEnd(shape, e.target),
              ref: (n: Konva.Node | null) => { if (n) nodeRefs.current.set(shape.id, n); else nodeRefs.current.delete(shape.id); },
            };
            if (shape.kind === "circle") {
              return <Circle key={shape.id} {...common} radius={shape.radius * scale} />;
            }
            if (shape.kind === "relief") {
              const img = reliefCanvas(shape);
              const { fill: _f, ...rest } = common;
              void _f;
              return (
                <Group key={shape.id} {...rest}>
                  <KonvaImage image={img} width={shape.width * scale} height={shape.height * scale} offsetX={(shape.width * scale) / 2} offsetY={(shape.height * scale) / 2} opacity={0.85} />
                  <Rect width={shape.width * scale} height={shape.height * scale} offsetX={(shape.width * scale) / 2} offsetY={(shape.height * scale) / 2} stroke={stroke} strokeWidth={strokeWidth} />
                </Group>
              );
            }
            if (shape.kind === "text" || (shape.kind === "path" && shape.holes && shape.holes.length)) {
              // compound outline: outer loops + holes, drawn with even-odd fill inside a Group
              const [cx0, cy0] = shapeCenter(shape);
              const loops: { pts: number[]; hole: boolean }[] = [];
              if (shape.kind === "text") {
                const unrot = { ...shape, rotation: 0 };
                for (const g of textToPolygons(unrot)) {
                  loops.push({ pts: g.outer.flatMap(([x, y]) => [(x - cx0) * scale, -(y - cy0) * scale]), hole: false });
                  for (const h of g.holes) loops.push({ pts: h.flatMap(([x, y]) => [(x - cx0) * scale, -(y - cy0) * scale]), hole: true });
                }
              } else {
                loops.push({ pts: shape.points.flatMap(([x, y]) => [(x - cx0) * scale, -(y - cy0) * scale]), hole: false });
                for (const h of shape.holes!) loops.push({ pts: h.flatMap(([x, y]) => [(x - cx0) * scale, -(y - cy0) * scale]), hole: true });
              }
              const { fill: _fill, stroke: _stroke, strokeWidth: _sw, ...groupProps } = common;
              void _fill; void _stroke; void _sw;
              if (loops.length === 0) {
                // font not loaded yet: placeholder box at the anchor
                return <Rect key={shape.id} {...groupProps} width={40 * scale} height={10 * scale} offsetX={20 * scale} offsetY={5 * scale} stroke={stroke} dash={[4, 4]} strokeWidth={1} />;
              }
              return (
                <Group key={shape.id} {...groupProps}>
                  {loops.map((l, i) => (
                    <Line key={i} points={l.pts} closed stroke={stroke} strokeWidth={strokeWidth} fill={l.hole ? (COLORS.table === "#ffffff" ? "#ffffff" : COLORS.table) : COLORS.fill} fillEnabled />
                  ))}
                </Group>
              );
            }
            const pts = localPoints(shape).flatMap(([x, y]) => [x * scale, -y * scale]);
            return <Line key={shape.id} {...common} points={pts} closed={shape.kind !== "path" || shape.closed} fill={shape.kind === "path" && !shape.closed ? undefined : COLORS.fill} />;
          })}

          {/* snap guides */}
          {guides.x !== null && <Line points={[toPx(guides.x, 0)[0], oy, toPx(guides.x, 0)[0], oy + tablePxH]} stroke={COLORS.guide} strokeWidth={1} dash={[4, 3]} listening={false} />}
          {guides.y !== null && <Line points={[ox, toPx(0, guides.y)[1], ox + workArea.width * scale, toPx(0, guides.y)[1]]} stroke={COLORS.guide} strokeWidth={1} dash={[4, 3]} listening={false} />}

          {/* marquee */}
          {marquee && (() => {
            const [ax, ay] = toPx(Math.min(marquee.x0, marquee.x1), Math.max(marquee.y0, marquee.y1));
            return <Rect x={ax} y={ay} width={Math.abs(marquee.x1 - marquee.x0) * scale} height={Math.abs(marquee.y1 - marquee.y0) * scale} fill={COLORS.marquee} stroke={COLORS.selected} dash={[4, 3]} listening={false} />;
          })()}

          {tool === "polygon" && draft.length > 0 && (
            <Group listening={false}>
              <Line points={[...draft, ...(hover ? [hover] : [])].flatMap(([x, y]) => toPx(x, y))} stroke={COLORS.selected} strokeWidth={1.5} dash={[6, 4]} />
              {draft.map(([x, y], i) => { const [px, py] = toPx(x, y); return <Circle key={i} x={px} y={py} radius={3.5} fill={i === 0 ? COLORS.origin : COLORS.selected} />; })}
            </Group>
          )}

          <Transformer
            ref={trRef}
            rotateEnabled={selectedShape?.kind !== "circle"}
            keepRatio={shiftDown || selectedShape?.kind === "circle" || selectedShape?.kind === "ngon"}
            enabledAnchors={selectedShape?.kind === "circle" || selectedShape?.kind === "ngon" ? ["top-left", "top-right", "bottom-left", "bottom-right"] : undefined}
            rotationSnaps={shiftDown ? [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345] : []}
            anchorSize={8}
            anchorCornerRadius={2}
            anchorStroke={COLORS.selected}
            borderStroke={COLORS.selected}
            borderDash={[4, 3]}
            ignoreStroke
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 4 || newBox.height < 4 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>
      {selectedShape && selectedBox && tool === "select" && (
        <InlineDimensions shape={selectedShape} anchorPx={toPx(selectedBox.maxX, selectedBox.maxY)} />
      )}
      {tool === "polygon" && (
        <div className="editor-hint" data-testid="polygon-hint">
          Polígono: clique para adicionar vértices ({draft.length}) · Enter ou duplo clique fecha · Esc cancela
        </div>
      )}
      <div className="editor-caption">
        Mesa {workArea.width} × {workArea.height} mm · Chapa {stock.width} × {stock.height} × {stock.thickness} mm · {scale.toFixed(2)} px/mm · zoom {Math.round(zoom * 100)}% · snap {snap ? "ligado (S)" : "desligado (S)"} · Shift+clique seleção múltipla
      </div>
    </div>
  );
}
