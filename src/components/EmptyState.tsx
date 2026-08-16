import { Square, FolderOpen, Compass, Upload, X } from "lucide-react";
import { useUiStore } from "../state/uiStore";
import { useProjectActions } from "./useProjectActions";
import { EXAMPLES } from "../content/examples";
import { ExampleThumb } from "./ExamplesGallery";
import { useProjectStore } from "../state/store";

/** Shown over the editor while the project has no shapes: 3 steps, examples, tour. */
export function EmptyState({ onTour }: { onTour: () => void }) {
  const actions = useProjectActions();
  const stock = useProjectStore((s) => s.settings.stock);
  const dismiss = useUiStore((s) => s.dismissEmpty);
  return (
    <div className="empty-state" data-testid="empty-state" role="region" aria-label="Comece por aqui">
      <button type="button" className="icon-button empty-close" onClick={dismiss} aria-label="Fechar" data-testid="empty-close"><X size={14} /></button>
      <h2>Comece por aqui</h2>
      <ol className="empty-steps">
        <li><strong>Chapa</strong> — confira o tamanho da sua chapa em <em>Máquina</em> (hoje {stock.width} × {stock.height} × {stock.thickness} mm).</li>
        <li><strong>Desenhe</strong> — adicione uma forma pela barra ou importe um SVG/DXF; ajuste medidas no painel <em>Peça</em>.</li>
        <li><strong>Exporte</strong> — confira em <em>Simular</em> e baixe o G-code para a sua router.</li>
      </ol>
      <div className="empty-actions">
        <button type="button" className="rb primary" onClick={actions.addRectangle} data-testid="empty-add-rectangle"><Square size={16} aria-hidden="true" /> Adicionar retângulo</button>
        <button type="button" className="rb" onClick={actions.importSvg} data-testid="empty-import"><Upload size={16} aria-hidden="true" /> Importar SVG/DXF</button>
        <button type="button" className="rb" onClick={actions.openProject} data-testid="empty-open"><FolderOpen size={16} aria-hidden="true" /> Abrir projeto</button>
        <button type="button" className="rb" onClick={onTour} data-testid="empty-tour"><Compass size={16} aria-hidden="true" /> Tour rápido</button>
      </div>
      <h3>Ou abra um exemplo <button type="button" className="link" onClick={() => useUiStore.getState().setGalleryOpen(true)} data-testid="empty-gallery">ver todos ({EXAMPLES.length})</button></h3>
      <ul className="empty-examples">
        {EXAMPLES.filter((ex) => ["placa-furos", "tabua-carnes", "suporte-celular"].includes(ex.id)).map((ex) => (
          <li key={ex.id}>
            <button type="button" onClick={() => actions.openExample(ex.id)} data-testid={`example-${ex.id}`}>
              <ExampleThumb example={ex} width={120} height={60} />
              <span className="ex-title">{ex.title}</span>
              <span className="ex-desc">{ex.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
