import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useProjectStore } from "../state/store";
import { useSimStore } from "../state/simStore";
import { useUiStore } from "../state/uiStore";
import { buildToolpath, workOriginOffset, type Segment } from "../lib/toolpath";
import { useDerived } from "../state/derived";
import { estimateTime, formatDuration, type Timing } from "../lib/timing";
import { positionAt, segmentIndexAt } from "../lib/playback";
import { boundariesFor } from "../lib/playback";
import { segmentsToGCode } from "../lib/gcode";
import { createHeightmap, carveUpTo, removedVolume, type Heightmap, type ToolProfile } from "../lib/heightmap";
import { materialLook } from "../lib/materials";
import { buildToolModel } from "../lib/toolModel";
import { SimulatorControls } from "./SimulatorControls";
import { ViewCube, type ViewName } from "./ViewCube";

const COLORS = {
  bg: 0x16283d,
  table: 0x22384f,
  tableEdge: 0x4f88b8,
  through: new THREE.Color(0x5b4a3a),
  cut: 0xf3b64c,
  future: 0x4f88b8,
  rapid: 0x8aa4bd,
};


interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  persp: THREE.PerspectiveCamera;
  ortho: THREE.OrthographicCamera;
  camera: THREE.Camera;
  controls: OrbitControls;
  tool: THREE.Group | null;
  cutLines: THREE.LineSegments | null;
  rapidLines: THREE.LineSegments | null;
  cutColors: Float32Array | null;
  cutIndexBySegment: Int32Array | null;
  stockGroup: THREE.Group;
  surface: THREE.Mesh | null;
  surfaceColors: Float32Array | null;
  look: { top: THREE.Color; cut: THREE.Color; deep: THREE.Color };
  hm: Heightmap | null;
  anim: { from: THREE.Vector3; to: THREE.Vector3; target: THREE.Vector3; t0: number } | null;
  frameSubs: Set<(camera: THREE.Camera) => void>;
  lastMeshUpdate: number;
  needsRender: boolean;
}

function frameTarget(settings: ReturnType<typeof useProjectStore.getState>["settings"], segments: Segment[]) {
  const cut = segments.filter((s) => s.type === "feed" || s.type === "plunge");
  if (cut.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of cut) for (const p of [s.from, s.to]) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, size: Math.max(maxX - minX, maxY - minY, 30) * 1.5 };
  }
  const { stock } = settings;
  const [ox, oy] = workOriginOffset(settings);
  return { cx: stock.offsetX - ox + stock.width / 2, cy: stock.offsetY - oy + stock.height / 2, size: Math.max(stock.width, stock.height, 50) * 1.2 };
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
  const [ortho, setOrtho] = useState(false);
  const mousePreset = useUiStore((s) => s.mousePreset);
  const setMousePreset = useUiStore((s) => s.setMousePreset);
  const [carveMs, setCarveMs] = useState(0);

  const fontsVersion = useUiStore((s) => s.fontsVersion);
  // Segments come from the derived store when it already has them for this project (computed in the worker);
  // otherwise (first paint before the worker answers) fall back to a local build.
  const derivedSegments = useDerived((d) => (d.status === "ready" ? d.segments : null));
  const { segments, timing, gcodeLines } = useMemo(() => {
    const segs = derivedSegments ?? (shapes.length ? buildToolpath(shapes, settings).segments : ([] as Segment[]));
    const timing: Timing = estimateTime(segs, { rapidRate: settings.rapidRate, accel: settings.accel });
    const gcodeLines = segs.map((s) => segmentsToGCode([{ ...s, comment: undefined }])[0] ?? "");
    return { segments: segs, timing, gcodeLines };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedSegments, shapes, settings, fontsVersion]);

  const boundaries = useMemo(() => boundariesFor(segments, timing, stepMode), [segments, timing, stepMode]);
  useEffect(() => { configure(timing.total, boundaries); }, [timing.total, boundaries, configure]);
  useEffect(() => { useSimStore.setState({ boundaries }); }, [boundaries]);

  const toolProfile: ToolProfile = useMemo(
    () => ({ type: settings.toolType, radius: settings.toolDiameter / 2, angle: settings.vbitAngle }),
    [settings.toolType, settings.toolDiameter, settings.vbitAngle]
  );
  const profileFor = useMemo(() => {
    const cache = new Map<string | undefined, ToolProfile>();
    cache.set(undefined, toolProfile);
    for (const t of settings.tools) cache.set(t.id, { type: t.type, radius: t.diameter / 2, angle: t.vbitAngle });
    return (seg: Segment) => cache.get(seg.toolId) ?? toolProfile;
  }, [settings.tools, toolProfile]);
  const currentToolId = useRef<string | undefined | null>(null);

  const frameSubs = useRef(new Set<(camera: THREE.Camera) => void>());
  const subscribeFrame = useCallback((fn: (camera: THREE.Camera) => void) => {
    frameSubs.current.add(fn);
    return () => { frameSubs.current.delete(fn); };
  }, []);

  // ---------- scene (once) ----------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    scene.fog = new THREE.Fog(COLORS.bg, 2500, 6000);
    const persp = new THREE.PerspectiveCamera(40, width / height, 0.5, 20000);
    persp.up.set(0, 0, 1);
    const orthoCam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -5000, 20000);
    orthoCam.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(persp, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.zoomToCursor = true;
    controls.screenSpacePanning = false;

    scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x1a2634, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(300, -400, 700);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 3000;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc0e0, 0.4);
    fill.position.set(-500, 300, 400);
    scene.add(fill);

    const stockGroup = new THREE.Group();
    scene.add(stockGroup);

    refs.current = {
      renderer, scene, persp, ortho: orthoCam, camera: persp, controls,
      tool: null, cutLines: null, rapidLines: null, cutColors: null, cutIndexBySegment: null,
      stockGroup, surface: null, surfaceColors: null, look: { top: new THREE.Color(0xd9b98a), cut: new THREE.Color(0xf1dcb8), deep: new THREE.Color(0xb98d5a) }, hm: null, anim: null, frameSubs: frameSubs.current, lastMeshUpdate: 0, needsRender: true,
    };

    const invalidate = () => { if (refs.current) refs.current.needsRender = true; };
    controls.addEventListener("change", invalidate);

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tick(dt);
      const r = refs.current;
      if (!r) return;
      if (r.anim) {
        const k = Math.min((now - r.anim.t0) / 260, 1);
        const e = 1 - Math.pow(1 - k, 3);
        r.camera.position.lerpVectors(r.anim.from, r.anim.to, e);
        r.controls.target.copy(r.anim.target);
        if (k >= 1) r.anim = null;
      }
      r.controls.update();
      // A paused, unchanged scene has no GPU work. Continuous software rendering
      // otherwise delays unrelated UI interactions, including leaving the workspace.
      if (r.needsRender) {
        r.needsRender = false;
        r.renderer.render(scene, r.camera);
        r.frameSubs.forEach((fn) => fn(r.camera));
        const tg = r.controls.target;
        (window as unknown as { __simCam?: number[] }).__simCam = [r.camera.position.x - tg.x, r.camera.position.y - tg.y, r.camera.position.z - tg.z];
        (window as unknown as { __simRemoved?: number }).__simRemoved = r.hm ? removedVolume(r.hm) : 0;
      }
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      persp.aspect = w / h;
      persp.updateProjectionMatrix();
      const r = refs.current;
      if (r) {
        r.needsRender = true;
        const dist = r.ortho.position.distanceTo(r.controls.target) || 400;
        const half = dist * Math.tan((persp.fov * Math.PI) / 360);
        r.ortho.left = -half * (w / h); r.ortho.right = half * (w / h); r.ortho.top = half; r.ortho.bottom = -half;
        r.ortho.updateProjectionMatrix();
      }
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener("change", invalidate);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      refs.current = null;
    };
  }, [tick]);

  // ---------- mouse preset ----------
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    if (mousePreset === "fusion") {
      // Fusion-like: middle button pans, left orbits, wheel zooms to cursor.
      r.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
    } else {
      r.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    }
  }, [mousePreset]);

  // ---------- projection toggle ----------
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    r.needsRender = true;
    const from = r.camera;
    const to = ortho ? r.ortho : r.persp;
    if (from === to) return;
    to.position.copy(from.position);
    to.quaternion.copy(from.quaternion);
    const w = r.renderer.domElement.clientWidth || 1, h = r.renderer.domElement.clientHeight || 1;
    if (to instanceof THREE.OrthographicCamera) {
      const dist = to.position.distanceTo(r.controls.target);
      const half = dist * Math.tan((r.persp.fov * Math.PI) / 360);
      to.left = -half * (w / h); to.right = half * (w / h); to.top = half; to.bottom = -half;
      to.updateProjectionMatrix();
    }
    r.controls.object = to;
    r.camera = to;
    r.controls.update();
  }, [ortho]);

  // ---------- rebuild table/stock/heightmap/tool/path when the project changes ----------
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    r.needsRender = true;
    const { scene, stockGroup } = r;
    const { workArea, stock } = settings;
    const [ox, oy] = workOriginOffset(settings);

    stockGroup.clear();
    if (r.cutLines) { scene.remove(r.cutLines); r.cutLines.geometry.dispose(); r.cutLines = null; }
    if (r.rapidLines) { scene.remove(r.rapidLines); r.rapidLines.geometry.dispose(); r.rapidLines = null; }
    if (r.tool) { scene.remove(r.tool); (r.tool.userData.dispose as () => void)?.(); r.tool = null; }
    r.surface = null; r.surfaceColors = null; r.hm = null;

    // table
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(workArea.width, workArea.height),
      new THREE.MeshStandardMaterial({ color: COLORS.table, roughness: 0.9, metalness: 0 })
    );
    table.position.set(-ox + workArea.width / 2, -oy + workArea.height / 2, -stock.thickness - 0.2);
    table.receiveShadow = true;
    stockGroup.add(table);
    const grid = new THREE.GridHelper(Math.max(workArea.width, workArea.height), Math.round(Math.max(workArea.width, workArea.height) / 50), 0x39597a, 0x2b4560);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(-ox + workArea.width / 2, -oy + workArea.height / 2, -stock.thickness - 0.1);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    stockGroup.add(grid);
    const tableEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(workArea.width, workArea.height)), new THREE.LineBasicMaterial({ color: COLORS.tableEdge }));
    tableEdges.position.copy(table.position);
    stockGroup.add(tableEdges);
    stockGroup.add(new THREE.AxesHelper(25));

    // stock sides + bottom (top face is the heightmap surface)
    const look = materialLook(settings.material);
    r.look = { top: new THREE.Color(look.top), cut: new THREE.Color(look.cut), deep: new THREE.Color(look.deep) };
    const sideMat = new THREE.MeshStandardMaterial({ color: look.side, roughness: look.roughness ?? 0.85, metalness: look.metalness ?? 0 });
    const noTop = new THREE.MeshBasicMaterial({ visible: false });
    const box = new THREE.Mesh(new THREE.BoxGeometry(stock.width, stock.height, stock.thickness), [sideMat, sideMat, sideMat, sideMat, noTop, sideMat]);
    box.position.set(stock.offsetX - ox + stock.width / 2, stock.offsetY - oy + stock.height / 2, -stock.thickness / 2);
    box.castShadow = true;
    box.receiveShadow = true;
    stockGroup.add(box);

    // heightmap surface
    const hm = createHeightmap({ width: stock.width, height: stock.height, thickness: stock.thickness, originX: stock.offsetX - ox, originY: stock.offsetY - oy });
    const geo = new THREE.PlaneGeometry((hm.cols - 1) * hm.res, (hm.rows - 1) * hm.res, hm.cols - 1, hm.rows - 1);
    // PlaneGeometry rows go from +y (top) to -y; remap so vertex (row, col) matches hm index order (row 0 = min y).
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let row = 0; row < hm.rows; row++) {
      for (let col = 0; col < hm.cols; col++) {
        const i = row * hm.cols + col;
        pos.setXYZ(i, hm.originX + col * hm.res, hm.originY + row * hm.res, 0);
      }
    }
    pos.needsUpdate = true;
    const colors = new Float32Array(hm.cols * hm.rows * 3);
    for (let i = 0; i < hm.cols * hm.rows; i++) { colors[i * 3] = r.look.top.r; colors[i * 3 + 1] = r.look.top.g; colors[i * 3 + 2] = r.look.top.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.02, side: THREE.DoubleSide }));
    surface.receiveShadow = true;
    surface.castShadow = false;
    stockGroup.add(surface);
    r.surface = surface; r.surfaceColors = colors; r.hm = hm;

    // tool (default; swapped per segment while playing)
    const tool = buildToolModel({ type: settings.toolType, diameter: settings.toolDiameter, vbitAngle: settings.vbitAngle });
    scene.add(tool);
    r.tool = tool;
    currentToolId.current = undefined;

    // path lines
    const cutPos: number[] = [], rapidPos: number[] = [];
    const cutIndexBySegment = new Int32Array(segments.length).fill(-1);
    let cutCount = 0;
    segments.forEach((s, i) => {
      const isRapid = s.type === "rapid" || s.type === "retract";
      (isRapid ? rapidPos : cutPos).push(s.from[0], s.from[1], s.from[2] + 0.02, s.to[0], s.to[1], s.to[2] + 0.02);
      if (!isRapid) cutIndexBySegment[i] = cutCount++;
    });
    if (cutPos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(cutPos, 3));
      const cc = new Float32Array(cutPos.length);
      g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
      const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
      scene.add(lines);
      r.cutLines = lines; r.cutColors = cc; r.cutIndexBySegment = cutIndexBySegment;
    }
    if (rapidPos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(rapidPos, 3));
      const lines = new THREE.LineSegments(g, new THREE.LineDashedMaterial({ color: COLORS.rapid, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.6 }));
      lines.computeLineDistances();
      scene.add(lines);
      r.rapidLines = lines;
    }

    goToView(r, "iso", settings, segments, false);
    // force a full mesh update
    r.lastMeshUpdate = 0;
    hm.dirty = { r0: 0, r1: hm.rows };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, settings]);

  // ---------- per-t update: tool position, carve, colours ----------
  useEffect(() => {
    const r = refs.current;
    if (!r) return;
    r.needsRender = true;
    const [x, y, z] = positionAt(segments, timing, t);
    r.tool?.position.set(x, y, z);

    // path colours
    if (r.cutColors && r.cutIndexBySegment && r.cutLines) {
      const idx = segments.length ? segmentIndexAt(timing, t) : -1;
      const cut = new THREE.Color(COLORS.cut), fut = new THREE.Color(COLORS.future);
      const c = r.cutColors, index = r.cutIndexBySegment;
      for (let i = 0; i < segments.length; i++) {
        const ci = index[i];
        if (ci < 0) continue;
        const done = i < idx || (i === idx && t >= timing.total);
        const col = done ? cut : fut;
        const o = ci * 6;
        c[o] = col.r; c[o + 1] = col.g; c[o + 2] = col.b; c[o + 3] = col.r; c[o + 4] = col.g; c[o + 5] = col.b;
      }
      (r.cutLines.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    }

    // material removal
    if (r.hm && r.surface && r.surfaceColors) {
      const t0 = performance.now();
      const changed = carveUpTo(r.hm, segments, timing, t, profileFor);
      const now = performance.now();
      const shouldFlush = r.hm.dirty && (changed || r.lastMeshUpdate === 0) && (!playing || now - r.lastMeshUpdate > 40);
      if (shouldFlush) {
        flushSurface(r);
        r.lastMeshUpdate = now;
        setCarveMs(Math.round(now - t0));
      }
    }
    // swap the 3D tool model when the active tool changes
    const idx = segments.length ? segmentIndexAt(timing, t) : -1;
    const activeToolId = idx >= 0 ? segments[idx].toolId : undefined;
    if (r.tool && currentToolId.current !== activeToolId) {
      currentToolId.current = activeToolId;
      const lib = activeToolId ? settings.tools.find((x) => x.id === activeToolId) : undefined;
      const spec = lib ? { type: lib.type, diameter: lib.diameter, vbitAngle: lib.vbitAngle } : { type: settings.toolType, diameter: settings.toolDiameter, vbitAngle: settings.vbitAngle };
      r.scene.remove(r.tool);
      (r.tool.userData.dispose as () => void)?.();
      r.tool = buildToolModel(spec);
      r.tool.position.set(x, y, z);
      r.scene.add(r.tool);
    }
  }, [t, segments, timing, toolProfile, profileFor, playing, settings]);

  // register camera actions for the ribbon
  useEffect(() => {
    useUiStore.getState().setSimCamera({
      fit: () => refs.current && goToView(refs.current, "fit", settings, segments, true),
      top: () => refs.current && goToView(refs.current, "top", settings, segments, true),
      iso: () => refs.current && goToView(refs.current, "iso", settings, segments, true),
    });
    return () => useUiStore.getState().setSimCamera(null);
  }, [settings, segments]);

  const currentLine = segments.length ? gcodeLines[segmentIndexAt(timing, t)] ?? "" : "";

  return (
    <div className="simulator" data-testid="simulator">
      <div className="simulator-viewport">
        <div ref={mountRef} className="simulator-canvas" />
        <ViewCube
          subscribe={subscribeFrame}
          onView={(v) => refs.current && goToView(refs.current, v, settings, segments, true)}
          onHome={() => refs.current && goToView(refs.current, "iso", settings, segments, true)}
          ortho={ortho}
          onToggleOrtho={() => setOrtho((o) => !o)}
        />
        <div className="sim-overlay" aria-hidden="true">
          <span>{formatDuration(timing.total)} total</span>
          {carveMs > 20 && <span>· malha {carveMs} ms</span>}
        </div>
      </div>
      <SimulatorControls segments={segments} timing={timing} currentLine={currentLine} />
      <p className="simulator-legend">
        <span className="legend-swatch legend-cut" aria-hidden="true" /> cortado
        <span className="legend-swatch legend-future" aria-hidden="true" /> a cortar
        <span className="legend-swatch legend-rapid" aria-hidden="true" /> deslocamento rápido
        <label className="legend-mouse">
          Mouse
          <select value={mousePreset} onChange={(e) => setMousePreset(e.target.value as "standard" | "fusion")} data-testid="mouse-preset">
            <option value="standard">Padrão (esq. orbita, dir. move)</option>
            <option value="fusion">Fusion (meio move, esq. orbita)</option>
          </select>
        </label>
        <span className="legend-total">tempo total {formatDuration(timing.total)}{playing ? " · reproduzindo" : ""}</span>
      </p>
    </div>
  );
}

/** Push the heightmap's dirty rows into the surface geometry (positions + colours + normals). */
function flushSurface(r: SceneRefs) {
  const hm = r.hm!, surface = r.surface!, colors = r.surfaceColors!;
  const geo = surface.geometry;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
  const d = hm.dirty ?? { r0: 0, r1: hm.rows };
  const r0 = Math.max(0, d.r0), r1 = Math.min(hm.rows, d.r1);
  const depthMax = Math.max(hm.thickness, 1);
  for (let row = r0; row < r1; row++) {
    for (let col = 0; col < hm.cols; col++) {
      const i = row * hm.cols + col;
      const h = hm.heights[i];
      pos.setZ(i, h);
      let c: THREE.Color;
      if (h >= 0) c = r.look.top;
      else if (h <= -hm.thickness + 1e-6) c = COLORS.through;
      else {
        const k = Math.min(-h / depthMax, 1);
        c = r.look.cut.clone().lerp(r.look.deep, k);
      }
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
  }
  const start = r0 * hm.cols, count = (r1 - r0) * hm.cols;
  pos.clearUpdateRanges?.();
  pos.addUpdateRange?.(start * 3, count * 3);
  pos.needsUpdate = true;
  colAttr.clearUpdateRanges?.();
  colAttr.addUpdateRange?.(start * 3, count * 3);
  colAttr.needsUpdate = true;
  geo.computeVertexNormals();
  hm.dirty = null;
}

function goToView(r: SceneRefs, view: ViewName | "fit", settings: ReturnType<typeof useProjectStore.getState>["settings"], segments: Segment[], animate: boolean) {
  const { cx, cy, size } = frameTarget(settings, segments);
  const target = new THREE.Vector3(cx, cy, 0);
  const dist = Math.max(size * 1.6, 60);
  const dirs: Record<ViewName | "fit", THREE.Vector3> = {
    iso: new THREE.Vector3(0.6, -1, 0.85),
    fit: new THREE.Vector3(0.6, -1, 0.85),
    top: new THREE.Vector3(0, -0.0001, 1),
    bottom: new THREE.Vector3(0, -0.0001, -1),
    front: new THREE.Vector3(0, -1, 0.0001),
    back: new THREE.Vector3(0, 1, 0.0001),
    left: new THREE.Vector3(-1, 0, 0.0001),
    right: new THREE.Vector3(1, 0, 0.0001),
  };
  const dir = dirs[view].clone().normalize();
  const to = target.clone().add(dir.multiplyScalar(view === "fit" || view === "iso" ? dist : r.camera.position.distanceTo(r.controls.target) || dist));
  r.persp.far = Math.max(dist * 40, 5000);
  r.persp.updateProjectionMatrix();
  if (r.camera instanceof THREE.OrthographicCamera) {
    const w = r.renderer.domElement.clientWidth || 1, h = r.renderer.domElement.clientHeight || 1;
    const half = to.distanceTo(target) * Math.tan((r.persp.fov * Math.PI) / 360);
    r.camera.left = -half * (w / h); r.camera.right = half * (w / h); r.camera.top = half; r.camera.bottom = -half;
    r.camera.updateProjectionMatrix();
  }
  if (animate) {
    r.anim = { from: r.camera.position.clone(), to, target, t0: performance.now() };
  } else {
    r.anim = null;
    r.camera.position.copy(to);
    r.controls.target.copy(target);
    r.controls.update();
  }
}
