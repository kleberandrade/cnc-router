import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useProjectStore } from "../state/store";
import { useSimStore } from "../state/simStore";
import { useUiStore } from "../state/uiStore";
import { buildToolpath, workOriginOffset, type Segment } from "../lib/toolpath";
import { estimateTime, formatDuration, type Timing } from "../lib/timing";
import { positionAt, boundariesFor, segmentIndexAt } from "../lib/playback";
import { segmentsToGCode } from "../lib/gcode";
import { SimulatorControls } from "./SimulatorControls";

const COLORS = {
  bg: 0x16283d,
  table: 0x22384f,
  tableEdge: 0x4f88b8,
  stock: 0xd6b280,
  cut: 0xf3b64c,
  future: 0x4f88b8,
  rapid: 0x8aa4bd,
  tool: 0xe8f1f8,
};

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  tool: THREE.Mesh;
  cutLines: THREE.LineSegments | null;
  rapidLines: THREE.LineSegments | null;
  cutColors: Float32Array | null;
  /** cut-line segment index → position in cutColors (2 vertices each) */
  cutIndexBySegment: Int32Array | null;
  stockGroup: THREE.Group;
}

export function Simulator() {
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const configure = useSimStore((s) => s.configure);
  const tick = useSimStore((s) => s.tick);
  const t = useSimStore((s) => s.t);
  const playing = useSimStore((s) => s.playing);
  const stepMode = useSimStore((s) => s.stepMode);

  const mountRef = useRef<HTMLDivElement>(null);
  const refs = useRef<SceneRefs | null>(null);

  const { segments, timing, gcodeLines } = useMemo(() => {
    const tp = shapes.length ? buildToolpath(shapes, settings) : { segments: [] as Segment[], shapeCount: 0 };
    const timing: Timing = estimateTime(tp.segments, { rapidRate: settings.rapidRate });
    // One G-code line per segment (comments stripped) for the "current line" readout.
    const gcodeLines = tp.segments.map((s) => segmentsToGCode([{ ...s, comment: undefined }])[0] ?? "");
    return { segments: tp.segments, timing, gcodeLines };
  }, [shapes, settings]);

  const boundaries = useMemo(() => boundariesFor(segments, timing, stepMode), [segments, timing, stepMode]);

  // Configure the player whenever the toolpath (or step mode) changes.
  useEffect(() => {
    configure(timing.total, boundaries);
  }, [timing.total, boundaries, configure]);

  // Keep boundaries fresh without resetting t when only step mode changes.
  useEffect(() => {
    useSimStore.setState({ boundaries });
  }, [boundaries]);

  // --- three.js scene (created once) ---
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.up.set(0, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(200, -300, 500);
    scene.add(dir);

    const toolMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 20, 24),
      new THREE.MeshStandardMaterial({ color: COLORS.tool, metalness: 0.4, roughness: 0.4 })
    );
    toolMesh.geometry.rotateX(Math.PI / 2); // cylinder axis along Z
    toolMesh.geometry.translate(0, 0, 10); // tip at origin
    scene.add(toolMesh);

    const stockGroup = new THREE.Group();
    scene.add(stockGroup);

    refs.current = {
      renderer, scene, camera, controls, tool: toolMesh,
      cutLines: null, rapidLines: null, cutColors: null, cutIndexBySegment: null, stockGroup,
    };

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tick(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      refs.current = null;
    };
  }, [tick]);

  // --- rebuild table/stock/path when project changes ---
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    const { scene, stockGroup } = r;
    const { workArea, stock } = settings;
    const [ox, oy] = workOriginOffset(settings);

    // clear previous
    stockGroup.clear();
    if (r.cutLines) { scene.remove(r.cutLines); r.cutLines.geometry.dispose(); r.cutLines = null; }
    if (r.rapidLines) { scene.remove(r.rapidLines); r.rapidLines.geometry.dispose(); r.rapidLines = null; }

    // table (work coords: table front-left = (-ox, -oy))
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(workArea.width, workArea.height),
      new THREE.MeshStandardMaterial({ color: COLORS.table, side: THREE.DoubleSide })
    );
    table.position.set(-ox + workArea.width / 2, -oy + workArea.height / 2, -stock.thickness - 0.05);
    stockGroup.add(table);
    const tableEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(workArea.width, workArea.height)),
      new THREE.LineBasicMaterial({ color: COLORS.tableEdge })
    );
    tableEdges.position.copy(table.position);
    stockGroup.add(tableEdges);

    // stock: top surface at Z=0
    const stockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(stock.width, stock.height, stock.thickness),
      new THREE.MeshStandardMaterial({ color: COLORS.stock, transparent: true, opacity: 0.55 })
    );
    stockMesh.position.set(
      stock.offsetX - ox + stock.width / 2,
      stock.offsetY - oy + stock.height / 2,
      -stock.thickness / 2
    );
    stockGroup.add(stockMesh);
    stockGroup.add(new THREE.AxesHelper(20));

    // path lines
    const cutPos: number[] = [];
    const rapidPos: number[] = [];
    const cutIndexBySegment = new Int32Array(segments.length).fill(-1);
    let cutCount = 0;
    segments.forEach((s, i) => {
      const isRapid = s.type === "rapid" || s.type === "retract";
      const target = isRapid ? rapidPos : cutPos;
      target.push(s.from[0], s.from[1], s.from[2], s.to[0], s.to[1], s.to[2]);
      if (!isRapid) cutIndexBySegment[i] = cutCount++;
    });
    if (cutPos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(cutPos, 3));
      const colors = new Float32Array(cutPos.length);
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true }));
      scene.add(lines);
      r.cutLines = lines;
      r.cutColors = colors;
      r.cutIndexBySegment = cutIndexBySegment;
    }
    if (rapidPos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(rapidPos, 3));
      const lines = new THREE.LineSegments(
        g,
        new THREE.LineDashedMaterial({ color: COLORS.rapid, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.7 })
      );
      lines.computeLineDistances();
      scene.add(lines);
      r.rapidLines = lines;
    }

    // tool radius
    const radius = Math.max(settings.toolDiameter / 2, 0.5);
    r.tool.scale.set(radius, radius, 1);

    fitCamera(r, settings, segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, settings]);

  // --- per-frame-ish: update tool position + cut/future colours when t changes ---
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    const [x, y, z] = positionAt(segments, timing, t);
    r.tool.position.set(x, y, z);
    if (r.cutColors && r.cutIndexBySegment && r.cutLines) {
      const idx = segments.length ? segmentIndexAt(timing, t) : -1;
      const cut = new THREE.Color(COLORS.cut);
      const fut = new THREE.Color(COLORS.future);
      const c: Float32Array = r.cutColors;
      const index: Int32Array = r.cutIndexBySegment;
      for (let i = 0; i < segments.length; i++) {
        const ci: number = index[i];
        if (ci < 0) continue;
        const done = i < idx || (i === idx && t >= timing.total);
        const col = done ? cut : fut;
        const o = ci * 6;
        c[o] = col.r; c[o + 1] = col.g; c[o + 2] = col.b;
        c[o + 3] = col.r; c[o + 4] = col.g; c[o + 5] = col.b;
      }
      // current segment: partially cut → colour it "cut" (simple, cheap)
      if (idx >= 0 && index[idx] >= 0 && t > 0) {
        const o = index[idx] * 6;
        c[o] = cut.r; c[o + 1] = cut.g; c[o + 2] = cut.b;
      }
      (r.cutLines.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    }
  }, [t, segments, timing]);

  // Expose camera actions to the TopBar ribbon while mounted.
  useEffect(() => {
    useUiStore.getState().setSimCamera({
      fit: () => refs.current && fitCamera(refs.current, settings, segments),
      top: () => refs.current && topCamera(refs.current, settings, segments),
      iso: () => refs.current && fitCamera(refs.current, settings, segments),
    });
    return () => useUiStore.getState().setSimCamera(null);
  }, [settings, segments]);

  const currentLine = segments.length ? gcodeLines[segmentIndexAt(timing, t)] ?? "" : "";

  return (
    <div className="simulator" data-testid="simulator">
      <div ref={mountRef} className="simulator-canvas" />
      <SimulatorControls segments={segments} timing={timing} currentLine={currentLine} />
      <p className="simulator-legend">
        <span className="legend-swatch legend-cut" aria-hidden="true" /> cortado
        <span className="legend-swatch legend-future" aria-hidden="true" /> a cortar
        <span className="legend-swatch legend-rapid" aria-hidden="true" /> deslocamento rápido
        <span className="legend-total">tempo total {formatDuration(timing.total)}{playing ? " · reproduzindo" : ""}</span>
      </p>
    </div>
  );
}

/** Center/size of what to frame: the cut path if any, otherwise the stock. */
function frameTarget(settings: ReturnType<typeof useProjectStore.getState>["settings"], segments: Segment[]) {
  const cut = segments.filter((s) => s.type === "feed" || s.type === "plunge");
  if (cut.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of cut) {
      for (const p of [s.from, s.to]) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, size: Math.max(maxX - minX, maxY - minY, 30) * 1.4 };
  }
  const { stock } = settings;
  const [ox, oy] = workOriginOffset(settings);
  return {
    cx: stock.offsetX - ox + stock.width / 2,
    cy: stock.offsetY - oy + stock.height / 2,
    size: Math.max(stock.width, stock.height, 50),
  };
}

function fitCamera(r: SceneRefs, settings: ReturnType<typeof useProjectStore.getState>["settings"], segments: Segment[]) {
  const { cx, cy, size } = frameTarget(settings, segments);
  r.controls.target.set(cx, cy, 0);
  r.camera.position.set(cx + size * 0.6, cy - size * 1.1, size * 0.9);
  r.camera.near = 0.1;
  r.camera.far = Math.max(size * 50, 5000);
  r.camera.updateProjectionMatrix();
  r.controls.update();
}

function topCamera(r: SceneRefs, settings: ReturnType<typeof useProjectStore.getState>["settings"], segments: Segment[]) {
  const { cx, cy, size } = frameTarget(settings, segments);
  r.controls.target.set(cx, cy, 0);
  r.camera.position.set(cx, cy - 0.001, size * 1.6);
  r.camera.updateProjectionMatrix();
  r.controls.update();
}
