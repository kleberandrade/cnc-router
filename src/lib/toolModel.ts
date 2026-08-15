import * as THREE from "three";
import type { ToolType } from "../types";

export interface ToolModelOptions {
  type: ToolType;
  diameter: number;
  /** included angle for V-bits (deg) */
  vbitAngle: number;
  /** cutting length, mm */
  fluteLength?: number;
  shankLength?: number;
}

const METAL = { metalness: 0.85, roughness: 0.35 };

/**
 * Builds a spindle + collet + end mill assembly with the tool tip at the group origin (0,0,0), axis +Z.
 * Materials are shared per instance; call `dispose` on the returned group when done.
 */
export function buildToolModel(opts: ToolModelOptions): THREE.Group {
  const d = Math.max(opts.diameter, 0.5);
  const r = d / 2;
  const flute = opts.fluteLength ?? Math.max(12, d * 3);
  const shankD = d >= 6 ? d : d >= 3 ? 3.175 : d; // common shank sizes
  const shankLen = opts.shankLength ?? 22;
  const g = new THREE.Group();

  const carbide = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, ...METAL });
  const fluteMat = new THREE.MeshStandardMaterial({ color: 0x6b7480, metalness: 0.9, roughness: 0.25 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.7, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3138, metalness: 0.3, roughness: 0.6 });

  const cyl = (rad: number, h: number, mat: THREE.Material, zBottom: number, radial = 32) => {
    const geo = new THREE.CylinderGeometry(rad, rad, h, radial);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, zBottom + h / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };

  // --- tip ---
  let tipH = 0;
  if (opts.type === "ball") {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), fluteMat);
    s.position.z = r;
    s.castShadow = true;
    g.add(s);
    tipH = r;
  } else if (opts.type === "vbit") {
    const half = ((opts.vbitAngle / 2) * Math.PI) / 180;
    const coneH = r / Math.tan(half);
    const cone = new THREE.ConeGeometry(r, coneH, 32);
    cone.rotateX(-Math.PI / 2); // apex at -z → flip so apex points down (−Z)
    cone.rotateX(Math.PI);
    cone.translate(0, 0, coneH / 2);
    const m = new THREE.Mesh(cone, fluteMat);
    m.castShadow = true;
    g.add(m);
    tipH = coneH;
  }

  // --- flutes: cylinder with two shallow helical grooves suggested by darker stripes (cheap: 2 thin helices) ---
  const fluteBody = cyl(r, flute, fluteMat, tipH);
  g.add(fluteBody);
  const tubeR = Math.max(r * 0.16, 0.15);
  const groove = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      const a = t * Math.PI * 2 * 1.5;
      return new THREE.Vector3(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, tipH + tubeR + t * (flute - 2 * tubeR));
    })),
    48, tubeR, 6, false
  );
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x3a4149, metalness: 0.6, roughness: 0.5 });
  for (const rot of [0, Math.PI]) {
    const gm = new THREE.Mesh(groove, grooveMat);
    gm.rotation.z = rot;
    g.add(gm);
  }

  // --- shank ---
  g.add(cyl(shankD / 2, shankLen, carbide, tipH + flute));
  const shankTop = tipH + flute + shankLen;

  // --- collet nut (ER11-like) + spindle nose + body ---
  const nut = new THREE.CylinderGeometry(9.5, 9.5, 12, 8);
  nut.rotateX(Math.PI / 2);
  nut.translate(0, 0, shankTop - 4 + 6);
  const nutMesh = new THREE.Mesh(nut, steel);
  nutMesh.castShadow = true;
  g.add(nutMesh);
  g.add(cyl(7, 6, dark, shankTop + 8, 24));
  g.add(cyl(26, 70, steel, shankTop + 14, 40));
  const cap = cyl(24, 6, dark, shankTop + 84, 40);
  g.add(cap);

  g.userData.dispose = () => {
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    [carbide, fluteMat, steel, dark, grooveMat].forEach((m) => m.dispose());
  };
  return g;
}
