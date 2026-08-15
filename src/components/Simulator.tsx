import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useProjectStore } from "../state/store";
import { shapeToPoints } from "../lib/geometry";

/** Flattens all shapes into a single ordered list of [x, y, z] toolpath waypoints, for the simulator only. */
export function buildSimulationPath(
  shapes: ReturnType<typeof useProjectStore.getState>["shapes"],
  safeHeight: number
): [number, number, number][] {
  const path: [number, number, number][] = [];
  for (const shape of shapes) {
    const points = shapeToPoints(shape);
    if (points.length === 0) continue;
    const [sx, sy] = points[0];
    path.push([sx, sy, safeHeight]);
    path.push([sx, sy, -shape.depth]);
    for (const [x, y] of points) {
      path.push([x, y, -shape.depth]);
    }
    path.push([sx, sy, safeHeight]);
  }
  return path;
}

export function Simulator() {
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const mountRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const stepRef = useRef(0);
  const toolMeshRef = useRef<THREE.Mesh | null>(null);
  const pathRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    pathRef.current = buildSimulationPath(shapes, settings.safeHeight);
    stepRef.current = 0;
  }, [shapes, settings.safeHeight]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16283d);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(80, -160, 140);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(200, 20, 0x4f88b8, 0x27435f);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    const toolGeometry = new THREE.SphereGeometry(2, 16, 16);
    const toolMaterial = new THREE.MeshBasicMaterial({ color: 0xe8f1f8 });
    const toolMesh = new THREE.Mesh(toolGeometry, toolMaterial);
    scene.add(toolMesh);
    toolMeshRef.current = toolMesh;

    let pathLine: THREE.Line | null = null;

    const rebuildPathLine = () => {
      if (pathLine) {
        scene.remove(pathLine);
        pathLine.geometry.dispose();
      }
      const points = pathRef.current.map(
        ([x, y, z]) => new THREE.Vector3(x, y, z)
      );
      if (points.length === 0) return;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x4f88b8 });
      pathLine = new THREE.Line(geometry, material);
      scene.add(pathLine);
    };

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (pathRef.current.length !== rebuiltCount) {
        rebuildPathLine();
        rebuiltCount = pathRef.current.length;
      }

      const path = pathRef.current;
      if (path.length > 0) {
        const idx = Math.min(stepRef.current, path.length - 1);
        const [x, y, z] = path[idx];
        toolMesh.position.set(x, y, z);
      }

      renderer.render(scene, camera);
    };
    let rebuiltCount = -1;
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const path = pathRef.current;
      if (path.length === 0) return;
      stepRef.current = (stepRef.current + 1) % path.length;
    }, 15);
    return () => clearInterval(interval);
  }, [playing]);

  const totalSteps = buildSimulationPath(shapes, settings.safeHeight).length;

  return (
    <div className="simulator" data-testid="simulator">
      <div ref={mountRef} className="simulator-canvas" />
      <div className="simulator-controls">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={totalSteps === 0}
          data-testid="simulate-toggle"
        >
          {playing ? "Pausar simulação" : "Simular"}
        </button>
        <button
          type="button"
          onClick={() => {
            stepRef.current = 0;
            setPlaying(false);
          }}
          disabled={totalSteps === 0}
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
}
