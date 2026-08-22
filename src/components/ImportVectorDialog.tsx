import { useMemo, useState } from "react";
import { parseDxf, type DxfLayerInfo } from "../lib/dxfImport";
import { parseSvg } from "../lib/svgImport";
import { projectThumbnail } from "../lib/thumbnail";
import { useProjectStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import type { PathShape, Shape } from "../types";

/** mm per drawing unit, for the unit override. */
const UNITS: { label: string; scale: number }[] = [
  { label: "Milímetros", scale: 1 },
  { label: "Centímetros", scale: 10 },
  { label: "Metros", scale: 1000 },
  { label: "Polegadas", scale: 25.4 },
  { label: "Pés", scale: 304.8 },
];

interface Parsed {
  shapes: Shape[];
  warnings: string[];
  layers: DxfLayerInfo[];
  holes: number;
  error?: string;
}

/**
 * What comes in before it lands on the stock: which layers, which unit, and whether inner loops
 * become holes. Importing used to be blind — with hole inference in the mix, a wrong guess has to be
 * visible and reversible before the shapes are on the table, not after.
 */
export function ImportVectorDialog({ file, text, onDone }: { file: File; text: string; onDone: () => void }) {
  const stock = useProjectStore((s) => s.settings.stock);
  const addShapes = useProjectStore((s) => s.addShapes);
  const setNotice = useUiStore((s) => s.setNotice);
  const setSection = useUiStore((s) => s.setSection);

  const isDxf = /\.dxf$/i.test(file.name);
  const [inferHoles, setInferHoles] = useState(true);
  const [unitScale, setUnitScale] = useState<number | undefined>(undefined);
  const [off, setOff] = useState<string[]>([]);

  // every layer, read once — the checkboxes filter this list instead of re-reading the file
  const allLayers = useMemo<DxfLayerInfo[]>(() => {
    if (!isDxf) return [];
    try {
      return parseDxf(text, { depth: stock.thickness }).layers;
    } catch {
      return [];
    }
  }, [isDxf, text, stock.thickness]);

  const on = allLayers.filter((l) => !off.includes(l.name)).map((l) => l.name);

  const parsed = useMemo<Parsed>(() => {
    try {
      if (!isDxf) {
        const r = parseSvg(text, { depth: stock.thickness });
        return { shapes: r.shapes, warnings: r.warnings, layers: [], holes: 0 };
      }
      const r = parseDxf(text, { depth: stock.thickness, inferHoles, unitScale, layers: on });
      return { shapes: r.shapes, warnings: r.warnings, layers: r.layers, holes: r.holes };
    } catch {
      return { shapes: [], warnings: [], layers: [], holes: 0, error: `Esse ${isDxf ? "DXF" : "SVG"} não abriu.` };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDxf, text, stock.thickness, inferHoles, unitScale, off.join("|")]);

  const thumb = useMemo(() => projectThumbnail(parsed.shapes, 320, 200, 8), [parsed.shapes]);
  const holePaths = useMemo(
    () => parsed.shapes.filter((s): s is PathShape => s.kind === "path" && !!s.holes?.length).length,
    [parsed.shapes]
  );

  const doImport = () => {
    if (parsed.shapes.length === 0) return;
    addShapes(parsed.shapes.map((sh) => ({ ...sh, side: "outside" as const })));
    setSection("shape");
    const n = parsed.shapes.length;
    const furos = parsed.holes > 0 ? `, ${parsed.holes} ${parsed.holes === 1 ? "furo" : "furos"}` : "";
    setNotice({ kind: "info", title: `${n} ${n === 1 ? "peça veio" : "peças vieram"} do ${isDxf ? "DXF" : "SVG"}${furos}.` });
    onDone();
  };

  const toggleLayer = (name: string) =>
    setOff((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <div className="import-vec" data-testid="import-vector">
      <h2>Importar {isDxf ? "DXF" : "SVG"}</h2>
      <p className="hint">{file.name}</p>

      <div className="iv-body">
        <svg className="iv-preview" viewBox={thumb.viewBox} role="img" aria-label="Prévia do desenho" data-testid="import-preview">
          {thumb.paths.map((p, i) => (
            // fill + even-odd: é o que faz o furo aparecer como vazio, e não como um círculo solto
            <path key={i} d={p.d} className={p.fill ? "ex-thumb-fill" : "iv-shape"} fillRule="evenodd" />
          ))}
        </svg>

        <div className="iv-controls">
          {isDxf && (
            <>
              <label>
                Unidade do desenho
                <select
                  value={unitScale ?? ""}
                  onChange={(e) => setUnitScale(e.target.value ? Number(e.target.value) : undefined)}
                  data-testid="import-unit"
                >
                  <option value="">Como está no arquivo</option>
                  {UNITS.map((u) => <option key={u.scale} value={u.scale}>{u.label}</option>)}
                </select>
              </label>

              <label className="checkbox">
                <input type="checkbox" checked={inferHoles} onChange={(e) => setInferHoles(e.target.checked)} data-testid="import-infer-holes" />
                <span>Inferir furos{parsed.holes > 0 ? ` (${parsed.holes} em ${holePaths} ${holePaths === 1 ? "peça" : "peças"})` : ""}</span>
              </label>
              <p className="hint">Laços fechados dentro de outro viram furo da peça, em vez de contorno separado. Só agrupa dentro da mesma camada.</p>

              {allLayers.length > 1 && (
                <fieldset className="iv-layers" data-testid="import-layers">
                  <legend>Camadas</legend>
                  {allLayers.map((l) => (
                    <label className="checkbox" key={l.name}>
                      <input
                        type="checkbox"
                        checked={!off.includes(l.name)}
                        onChange={() => toggleLayer(l.name)}
                        data-testid={`import-layer-${l.name}`}
                      />
                      <span>{l.name} · {l.count} {l.count === 1 ? "forma" : "formas"}</span>
                    </label>
                  ))}
                </fieldset>
              )}
            </>
          )}

          {parsed.error && <p className="iv-error" data-testid="import-error">{parsed.error}</p>}
          {parsed.warnings.length > 0 && (
            <ul className="iv-warnings" data-testid="import-warnings">
              {parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="dialog-actions" style={{ padding: 0 }}>
        <span className="hint iv-count" data-testid="import-count">
          {parsed.shapes.length === 0 ? "Nada para importar" : `${parsed.shapes.length} ${parsed.shapes.length === 1 ? "peça" : "peças"}`}
        </span>
        <button type="button" className="dialog-close" onClick={onDone} data-testid="import-cancel">Cancelar</button>
        <button type="button" className="rb primary" onClick={doImport} disabled={parsed.shapes.length === 0} data-testid="import-confirm">Importar</button>
      </div>
    </div>
  );
}
