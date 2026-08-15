import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as THREE from "three";
import { ViewCube } from "../ViewCube";

describe("ViewCube", () => {
  it("renders six faces, calls onView/onHome/onToggleOrtho and follows the camera", () => {
    const onView = vi.fn(), onHome = vi.fn(), onToggle = vi.fn();
    let cb: ((c: THREE.Camera) => void) | null = null;
    const subscribe = (fn: (c: THREE.Camera) => void) => { cb = fn; return () => { cb = null; }; };
    render(<ViewCube subscribe={subscribe} onView={onView} onHome={onHome} ortho={false} onToggleOrtho={onToggle} />);
    for (const f of ["top", "bottom", "front", "back", "left", "right"]) expect(screen.getByTestId(`viewcube-${f}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("viewcube-top"));
    expect(onView).toHaveBeenCalledWith("top");
    fireEvent.click(screen.getByTestId("viewcube-home"));
    expect(onHome).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("viewcube-ortho"));
    expect(onToggle).toHaveBeenCalled();
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(100, -100, 100);
    cam.up.set(0, 0, 1);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    cb!(cam);
    const cube = screen.getByTestId("viewcube").querySelector(".viewcube-cube") as HTMLElement;
    expect(cube.style.transform).toContain("matrix3d");
  });
});
