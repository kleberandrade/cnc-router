import { useEffect, useRef } from "react";
import { Home, Box, Square } from "lucide-react";
import * as THREE from "three";

export type ViewName = "top" | "bottom" | "front" | "back" | "left" | "right" | "iso";

interface Props {
  /** Called every frame by the Simulator with the current camera; used to orient the cube. */
  subscribe: (fn: (camera: THREE.Camera) => void) => () => void;
  onView: (view: ViewName) => void;
  onHome: () => void;
  ortho: boolean;
  onToggleOrtho: () => void;
}

const FACES: { id: ViewName; label: string; transform: string }[] = [
  { id: "top", label: "TOPO", transform: "rotateX(90deg) translateZ(30px)" },
  { id: "bottom", label: "BASE", transform: "rotateX(-90deg) translateZ(30px)" },
  { id: "front", label: "FRENTE", transform: "translateZ(30px)" },
  { id: "back", label: "TRÁS", transform: "rotateY(180deg) translateZ(30px)" },
  { id: "right", label: "DIR", transform: "rotateY(90deg) translateZ(30px)" },
  { id: "left", label: "ESQ", transform: "rotateY(-90deg) translateZ(30px)" },
];

/**
 * Fusion-style navigation cube (CSS 3D). Faces are clickable; the cube rotates with the camera.
 * World: Z up, Y towards the back of the machine. Cube CSS space: Y up, so we map (x, y, z) → (x, z, -y).
 */
export function ViewCube({ subscribe, onView, onHome, ortho, onToggleOrtho }: Props) {
  const cubeRef = useRef<HTMLDivElement>(null);
  const q = useRef(new THREE.Quaternion());
  const rinv = useRef(new THREE.Matrix4());
  // world → cube-space: css.x = wx, css.y = -wz (CSS y points down, world z up), css.z = -wy (front of machine = -Y faces the viewer)
  const S = useRef(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, 0, 0, 0, 0, 1));
  const Fy = useRef(new THREE.Matrix4().makeScale(1, -1, 1));
  const T = useRef(new THREE.Matrix4());

  useEffect(() => {
    return subscribe((camera) => {
      const el = cubeRef.current;
      if (!el) return;
      // screen_css = Fy · R_cam⁻¹ · world  and  world = S⁻¹ · cube  (S is orthonormal & symmetric → S⁻¹ = S)
      camera.getWorldQuaternion(q.current);
      rinv.current.makeRotationFromQuaternion(q.current.invert());
      T.current.copy(Fy.current).multiply(rinv.current).multiply(S.current);
      const f = T.current.elements;
      el.style.transform = `translateZ(-30px) matrix3d(${f.map((v) => v.toFixed(5)).join(",")})`;
    });
  }, [subscribe]);

  return (
    <div className="viewcube" data-testid="viewcube">
      <div className="viewcube-scene">
        <div className="viewcube-cube" ref={cubeRef}>
          {FACES.map((f) => (
            <button
              key={f.id}
              type="button"
              className="viewcube-face"
              style={{ transform: f.transform }}
              onClick={() => onView(f.id)}
              data-testid={`viewcube-${f.id}`}
              title={`Vista ${f.label.toLowerCase()}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="viewcube-buttons">
        <button type="button" className="icon-button" onClick={onHome} title="Vista inicial (isométrica)" aria-label="Vista inicial" data-testid="viewcube-home">
          <Home size={14} />
        </button>
        <button type="button" className="icon-button" onClick={() => onView("iso")} title="Isométrica" aria-label="Isométrica" data-testid="viewcube-iso">
          <Box size={14} />
        </button>
        <button
          type="button"
          className={`icon-button${ortho ? " active" : ""}`}
          onClick={onToggleOrtho}
          title={ortho ? "Perspectiva" : "Ortográfica"}
          aria-pressed={ortho}
          aria-label="Alternar projeção"
          data-testid="viewcube-ortho"
        >
          <Square size={14} />
        </button>
      </div>
    </div>
  );
}
