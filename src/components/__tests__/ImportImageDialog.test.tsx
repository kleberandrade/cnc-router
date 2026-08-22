import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";
import type { GrayImage } from "../../lib/imageTrace";
import type { PathShape, ReliefShape } from "../../types";

// jsdom não decodifica imagem nem desenha em canvas: o carregamento vira um stub que devolve
// uma imagem sintética (quadrado preto no centro) — o resto do pipeline (traçado, limiar,
// conversão para mm) roda de verdade.
const FAKE: GrayImage = (() => {
  const w = 40, h = 40;
  const data = new Uint8Array(w * h).fill(255);
  for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) data[y * w + x] = 0;
  return { w, h, data };
})();

vi.mock("../../lib/imageTrace", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/imageTrace")>();
  return { ...real, imageToGray: () => FAKE };
});

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = FAKE.w;
  naturalHeight = FAKE.h;
  set src(v: string) {
    queueMicrotask(() => (v === "blob:bad" ? this.onerror?.() : this.onload?.()));
  }
}

import { ImportImageDialog } from "../ImportImageDialog";

describe("ImportImageDialog", () => {
  let urlValue = "blob:ok";
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useUiStore.setState({ notice: null });
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => urlValue), revokeObjectURL: vi.fn() });
    // o canvas de prévia não existe no jsdom: um contexto fake absorve as chamadas de pintura
    const fakeCtx = {
      imageSmoothingEnabled: false, strokeStyle: "", lineWidth: 0,
      clearRect: vi.fn(), drawImage: vi.fn(), putImageData: vi.fn(),
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx as never);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    urlValue = "blob:ok";
  });

  const open = (name = "gato.png") =>
    render(<ImportImageDialog file={new File(["x"], name, { type: "image/png" })} onDone={() => {}} />);

  it("silhueta: traça o quadrado e importa como path passante", async () => {
    open();
    await waitFor(() => expect(screen.getByTestId("ii-count")).toHaveTextContent("1 contorno"));
    fireEvent.click(screen.getByTestId("ii-apply"));
    const shapes = useProjectStore.getState().shapes;
    expect(shapes).toHaveLength(1);
    const p = shapes[0] as PathShape;
    expect(p.kind).toBe("path");
    expect(p.closed).toBe(true);
    expect(p.cutThrough).toBe(true);
    expect(p.name).toBe("gato");
    expect(useUiStore.getState().notice?.title).toContain("1 contorno veio de gato.png");
  });

  it("largura em mm manda na escala do contorno", async () => {
    open();
    await waitFor(() => expect(screen.getByTestId("ii-count")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("ii-width"), { target: { value: "80" } });
    fireEvent.click(screen.getByTestId("ii-apply"));
    const p = useProjectStore.getState().shapes[0] as PathShape;
    const xs = p.points.map(([x]) => x);
    // quadrado ocupa metade da imagem: ~40 mm de 80
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(35);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(45);
  });

  it("modo relevo importa um ReliefShape com a grade da imagem", async () => {
    open("montanha.png");
    await waitFor(() => expect(screen.getByTestId("ii-mode-relief")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("ii-mode-relief"));
    fireEvent.click(screen.getByTestId("ii-apply"));
    const r = useProjectStore.getState().shapes[0] as ReliefShape;
    expect(r.kind).toBe("relief");
    expect(r.cols).toBe(FAKE.w);
    expect(r.operation).toBe("pocket");
    expect(useUiStore.getState().notice?.title).toContain("Relevo importado");
  });

  it("imagem que não abre mostra o recado da oficina", async () => {
    urlValue = "blob:bad";
    open("ruim.png");
    await waitFor(() => expect(screen.getByText(/Não consegui abrir/i)).toBeInTheDocument());
    expect(screen.getByTestId("ii-apply")).toBeDisabled();
  });

  it("inverter troca figura e fundo (o quadrado vira o vazio)", async () => {
    open();
    await waitFor(() => expect(screen.getByTestId("ii-count")).toBeInTheDocument());
    const before = screen.getByTestId("ii-count").textContent;
    fireEvent.click(screen.getByTestId("ii-invert"));
    await waitFor(() => expect(screen.getByTestId("ii-count").textContent).not.toBe(before));
  });
});
