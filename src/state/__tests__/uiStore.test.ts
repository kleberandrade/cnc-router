import { describe, it, expect } from "vitest";
import { useUiStore, ZOOM_MAX, ZOOM_MIN } from "../uiStore";

const S = useUiStore.getState;

describe("uiStore", () => {
  it("zoom clamps and fit resets pan", () => {
    S().setZoom(100);
    expect(S().zoom).toBe(ZOOM_MAX);
    S().setZoom(0.01);
    expect(S().zoom).toBe(ZOOM_MIN);
    S().setZoom(1);
    S().zoomIn();
    expect(S().zoom).toBeCloseTo(1.25);
    S().zoomOut();
    expect(S().zoom).toBeCloseTo(1);
    S().setPan({ x: 5, y: 5 });
    S().zoomFit();
    expect(S().pan).toEqual({ x: 0, y: 0 });
  });
  it("tool/draft/snap/panel/sheet/view/notice/section/simCamera", () => {
    S().setDraft([[1, 2]]);
    S().setTool("polygon");
    expect(S().draft).toEqual([]);
    S().setTool("select");
    const snap = S().snap;
    S().toggleSnap();
    expect(S().snap).toBe(!snap);
    S().togglePanel();
    S().setPanelOpen(true);
    expect(S().panelOpen).toBe(true);
    S().setSheetOpen(true);
    S().toggleSheetExpanded();
    expect(S().sheetExpanded).toBe(true);
    S().setView("simulator");
    expect(S().view).toBe("simulator");
    S().setNotice({ kind: "info", title: "x" });
    expect(S().notice?.title).toBe("x");
    S().setSection("cut");
    expect(S().section).toBe("cut");
    const cam = { fit: () => {}, top: () => {}, iso: () => {} };
    S().setSimCamera(cam);
    expect(S().simCamera).toBe(cam);
  });
});

describe("uiStore theme & mouse", () => {
  it("persists theme and mouse preset", () => {
    S().setTheme("dark");
    expect(S().theme).toBe("dark");
    expect(localStorage.getItem("oficina-cnc:theme")).toBe("dark");
    S().setMousePreset("fusion");
    expect(localStorage.getItem("oficina-cnc:mouse")).toBe("fusion");
    S().setTheme("system");
  });
});

describe("uiStore — diálogos e arquivos pendentes (Sprints 28/29)", () => {
  it("vectorFile e galleryOpen guardam e limpam", () => {
    const st = useUiStore.getState();
    const file = new File(["<svg/>"], "p.svg");
    st.setVectorFile({ file, text: "<svg/>" });
    expect(useUiStore.getState().vectorFile?.text).toBe("<svg/>");
    st.setVectorFile(null);
    expect(useUiStore.getState().vectorFile).toBeNull();

    st.setGalleryOpen(true);
    expect(useUiStore.getState().galleryOpen).toBe(true);
    st.setGalleryOpen(false);
  });

  it("ids antigos do painel caem na aba certa", () => {
    const st = useUiStore.getState();
    st.setSection("navigator");
    expect(useUiStore.getState().section).toBe("shape");
    st.setSection("material");
    expect(useUiStore.getState().section).toBe("cut");
    st.setSection("stock");
    expect(useUiStore.getState().section).toBe("machine");
    st.setSection("tools");
    expect(useUiStore.getState().section).toBe("cut");
  });
});
