import { useEffect, useRef } from "react";
import { extrudeRegion, extrudeShape } from "../lib/extrude";
import type { Point } from "../lib/geometry";
import { materialLook } from "../lib/materials";
import { useProjectStore } from "../state/store";
import type { Shape } from "../types";

/**
 * Peça pronta em 3D (Sprint 31): a extrusão limpa do desenho — sem chapa, sem fresa.
 * O Three.js entra pelo mesmo chunk do simulador (import dinâmico); arrastar gira a peça.
 * Com `geometry`, extruda esse contorno em vez da peça — é como o conjunto colado aparece (Sprint 33).
 */
export function PartView3D({ shape, geometry }: { shape: Shape; geometry?: { outer: Point[]; holes: Point[][] } }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const material = useProjectStore((s) => s.settings.material);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    void import("three").then((THREE) => {
      if (disposed || !host) return;
      const W = host.clientWidth || 640, H = host.clientHeight || 480;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, W / H, 1, 5000);
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const sun = new THREE.DirectionalLight(0xffffff, 1.1);
      sun.position.set(1, -1.2, 1.6);
      scene.add(sun);

      const thickness = useProjectStore.getState().settings.stock.thickness;
      const data = geometry ? extrudeRegion(geometry.outer, geometry.holes, thickness) : extrudeShape(shape, thickness);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
      geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const center = bb.getCenter(new THREE.Vector3());
      const size = bb.getSize(new THREE.Vector3()).length();

      const look = materialLook(material);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: look.top, metalness: look.metalness ?? 0.05, roughness: 0.75 })
      );
      const pivot = new THREE.Group();
      mesh.position.sub(center);
      pivot.add(mesh);
      pivot.rotation.x = -0.9; // peça deitada, vista de 3/4
      pivot.rotation.z = 0.5;
      scene.add(pivot);
      camera.position.set(0, 0, size * 1.4);
      camera.lookAt(0, 0, 0);

      const render = () => renderer.render(scene, camera);
      render();

      // arrastar gira (sem OrbitControls: menos código, mesmo resultado para conferir a peça)
      let dragging = false, lastX = 0, lastY = 0;
      const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        pivot.rotation.z += (e.clientX - lastX) * 0.01;
        pivot.rotation.x += (e.clientY - lastY) * 0.01;
        lastX = e.clientX; lastY = e.clientY;
        render();
      };
      const up = () => { dragging = false; };
      renderer.domElement.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);

      cleanup = () => {
        renderer.domElement.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        geo.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => { disposed = true; cleanup?.(); };
  }, [shape, material, geometry]);

  return <div ref={hostRef} className="part-view-3d" data-testid="part-view-3d" role="img" aria-label="Peça pronta em 3D — arraste para girar" />;
}
