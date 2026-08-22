import { describe, it, expect, beforeEach } from "vitest";
import { useAnalysisStore, buildJob, runAnalysis, runShelf } from "../analysis";
import { useProjectStore } from "../store";
import type { RectangleShape } from "../../types";

const bracket: RectangleShape = {
  id: "b1", kind: "rectangle", x: 0, y: 0, width: 200, height: 100, rotation: 0, depth: 18, operation: "outline",
};

const reset = () =>
  useAnalysisStore.setState({
    mode: "inplane", scope: "part", shapeId: "b1", supports: [], loads: [], loadKg: 10, loadDir: "down",
    tool: "support", status: "idle", error: null, result: null, shelfResult: null,
    shelfSpan: 800, shelfLoadKg: 20, shelfLoadType: "distributed",
  });

describe("state/analysis", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useProjectStore.setState({ shapes: [bracket], selectedId: "b1", selectedIds: ["b1"] });
    useProjectStore.getState().setMaterial("pine", true);
    reset();
  });

  it("marcar lado com a ferramenta certa; o mesmo lado não fica apoiado E carregado", () => {
    const st = useAnalysisStore.getState();
    st.toggleSide(3);
    expect(useAnalysisStore.getState().supports).toEqual([3]);
    useAnalysisStore.getState().setTool("load");
    useAnalysisStore.getState().toggleSide(3); // vira carga, sai do apoio
    expect(useAnalysisStore.getState().supports).toEqual([]);
    expect(useAnalysisStore.getState().loads).toEqual([3]);
    useAnalysisStore.getState().toggleSide(3); // toggle remove
    expect(useAnalysisStore.getState().loads).toEqual([]);
  });

  it("buildJob traz material e espessura do projeto e converte kg em N", () => {
    useAnalysisStore.setState({ supports: [3], loads: [1], loadKg: 10, loadDir: "down" });
    const job = buildJob()!;
    expect(job).toBeTruthy();
    expect(job.E).toBe(9000);           // pinus
    expect(job.thickness).toBe(useProjectStore.getState().settings.stock.thickness);
    expect(job.force.fy).toBeCloseTo(-98.1, 1);
    expect(job.force.fx).toBe(0);
  });

  it("sem apoio ou sem carga: erro claro, sem conta", () => {
    runAnalysis();
    const st = useAnalysisStore.getState();
    expect(st.status).toBe("error");
    expect(st.error).toContain("apoiado");
  });

  it("análise completa (fallback síncrono nos testes): resultado com tensão, flecha e utilização", () => {
    useAnalysisStore.setState({ supports: [3], loads: [1], loadKg: 15, loadDir: "down" });
    runAnalysis();
    const st = useAnalysisStore.getState();
    expect(st.status).toBe("ready");
    expect(st.result).toBeTruthy();
    expect(st.result!.maxVonMises).toBeGreaterThan(0);
    expect(st.result!.maxDisp).toBeGreaterThan(0);
    expect(st.result!.utilization).toBeGreaterThan(0);
    expect(st.result!.tris.length).toBeGreaterThan(100);
  });

  it("mexer na carga invalida o resultado (nada de mapa velho na tela)", () => {
    useAnalysisStore.setState({ supports: [3], loads: [1] });
    runAnalysis();
    expect(useAnalysisStore.getState().result).toBeTruthy();
    useAnalysisStore.getState().setLoadKg(50);
    expect(useAnalysisStore.getState().result).toBeNull();
  });

  it("escopo Conjunto: peças encostadas coladas viram um job só; afastadas explicam em vez de rodar", () => {
    const second: RectangleShape = { ...bracket, id: "b2", x: 200, y: 0, width: 100 }; // encostada em x=200
    useProjectStore.setState({ shapes: [bracket, second] });
    useAnalysisStore.getState().setScope("assembly");
    useAnalysisStore.setState({ supports: [3], loads: [1], loadKg: 10 });
    const job = buildJob()!;
    expect(job).toBeTruthy();
    const xs = job.outer.map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(300, 0); // 200 + 100 coladas

    // afastando a segunda peça: grupos separados, mensagem clara, sem conta
    useProjectStore.setState({ shapes: [bracket, { ...second, x: 260 }] });
    runAnalysis();
    const st = useAnalysisStore.getState();
    expect(st.status).toBe("error");
    expect(st.error).toContain("grupos separados");
  });

  it("mudar para a prateleira volta o escopo para Peça (os lados mudam de dono)", () => {
    useAnalysisStore.getState().setScope("assembly");
    useAnalysisStore.setState({ supports: [1] });
    useAnalysisStore.getState().setMode("shelf");
    const st = useAnalysisStore.getState();
    expect(st.scope).toBe("part");
    expect(st.supports).toEqual([]);
  });

  it("prateleira: flecha, limite vão/300 e utilização com a largura menor da peça", () => {
    runShelf();
    const r = useAnalysisStore.getState().shelfResult!;
    expect(r).toBeTruthy();
    expect(r.widthUsed).toBe(100); // menor dimensão do retângulo 200×100
    expect(r.deflection).toBeGreaterThan(0);
    expect(r.visibleLimit).toBeCloseTo(800 / 300, 3);
    expect(r.utilization).toBeGreaterThan(0);
  });
});
