import { describe, it, expect, beforeEach } from "vitest";
import { importFile, importDropped, importPasted, openProjectFromText } from "../importEntry";
import { useProjectStore } from "../../state/store";
import { useUiStore } from "../../state/uiStore";
import { serializeProject } from "../../lib/projectFile";
import { DEFAULT_MACHINE_SETTINGS, type CircleShape } from "../../types";

const circle: CircleShape = { id: "c1", kind: "circle", x: 20, y: 20, radius: 10, depth: 5, operation: "outline" };
const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>`;

describe("importEntry — roteamento", () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useUiStore.setState({ notice: null, vectorFile: null, imageFile: null });
  });

  it("DXF e SVG caem no diálogo de importação, nunca direto na chapa", async () => {
    await importFile(new File([SVG], "peca.svg", { type: "image/svg+xml" }));
    expect(useUiStore.getState().vectorFile?.file.name).toBe("peca.svg");
    expect(useProjectStore.getState().shapes).toHaveLength(0);

    await importFile(new File(["0\nEOF"], "peca.dxf", { type: "application/dxf" }));
    expect(useUiStore.getState().vectorFile?.file.name).toBe("peca.dxf");
  });

  it("imagem cai no diálogo de imagem", async () => {
    await importFile(new File(["x"], "foto.png", { type: "image/png" }));
    expect(useUiStore.getState().imageFile?.name).toBe("foto.png");
    expect(useUiStore.getState().vectorFile).toBeNull();
  });

  it("projeto .json abre e avisa a contagem", async () => {
    const json = serializeProject([circle], DEFAULT_MACHINE_SETTINGS);
    await importFile(new File([json], "meu.oficina-cnc.json", { type: "application/json" }));
    expect(useProjectStore.getState().shapes).toHaveLength(1);
    expect(useUiStore.getState().notice?.title).toContain("1 peça");
  });

  it("formato desconhecido dá recado, não erro", async () => {
    await importFile(new File(["x"], "musica.mp3", { type: "audio/mpeg" }));
    expect(useUiStore.getState().notice?.kind).toBe("warning");
    expect(useUiStore.getState().notice?.title).toContain("musica.mp3");
  });

  it("vários arquivos soltos: o primeiro entra, o resto ganha aviso", async () => {
    await importDropped([
      new File([SVG], "a.svg", { type: "image/svg+xml" }),
      new File([SVG], "b.svg", { type: "image/svg+xml" }),
    ]);
    expect(useUiStore.getState().vectorFile?.file.name).toBe("a.svg");
    expect(useUiStore.getState().notice?.title).toContain("um de cada vez");
  });

  it("json quebrado mostra o erro do parser", async () => {
    expect(await openProjectFromText("{isso não é json", "ruim.json")).toBe(false);
    expect(useUiStore.getState().notice?.kind).toBe("error");
  });
});

describe("importEntry — colar", () => {
  beforeEach(() => useUiStore.setState({ notice: null, vectorFile: null, imageFile: null }));

  const dt = (init: { text?: string; imageType?: string }): DataTransfer => {
    const items: Partial<DataTransferItem>[] = [];
    if (init.imageType) {
      items.push({ kind: "file", type: init.imageType, getAsFile: () => new File(["img"], "", { type: init.imageType }) });
    }
    return {
      items: items as unknown as DataTransferItemList,
      getData: (t: string) => (t === "text/plain" ? init.text ?? "" : ""),
    } as unknown as DataTransfer;
  };

  it("SVG colado como texto abre o diálogo de importação", async () => {
    expect(await importPasted(dt({ text: SVG }))).toBe(true);
    expect(useUiStore.getState().vectorFile?.file.name).toBe("colado.svg");
  });

  it("imagem do clipboard abre o diálogo de imagem", async () => {
    expect(await importPasted(dt({ imageType: "image/png" }))).toBe(true);
    expect(useUiStore.getState().imageFile).not.toBeNull();
  });

  it("texto comum não é tratado", async () => {
    expect(await importPasted(dt({ text: "só um texto" }))).toBe(false);
  });
});
