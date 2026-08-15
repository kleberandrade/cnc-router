import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, LockOpen, Square, Circle as CircleIcon, Pentagon, Hexagon, RectangleHorizontal, ArrowUp, ArrowDown, Search } from "lucide-react";
import { useProjectStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import type { Shape } from "../types";

const KIND_ICON: Record<Shape["kind"], React.ReactNode> = {
  rectangle: <Square size={14} />,
  circle: <CircleIcon size={14} />,
  path: <Pentagon size={14} />,
  ngon: <Hexagon size={14} />,
  slot: <RectangleHorizontal size={14} />,
};
const KIND_LABEL: Record<Shape["kind"], string> = { rectangle: "Retângulo", circle: "Círculo", path: "Polígono", ngon: "Polígono regular", slot: "Rasgo" };

const shapeDisplayName = (shape: Shape, index: number): string => shape.name?.trim() || `${KIND_LABEL[shape.kind]} ${index + 1}`;

/** Fusion-like browser: list of shapes (= machining order), visibility, lock, rename, reorder. */
export function Navigator() {
  const shapes = useProjectStore((s) => s.shapes);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const select = useProjectStore((s) => s.select);
  const toggleSelect = useProjectStore((s) => s.toggleSelect);
  const updateShape = useProjectStore((s) => s.updateShape);
  const moveShape = useProjectStore((s) => s.moveShape);
  const settings = useProjectStore((s) => s.settings);
  const setSection = useUiStore((s) => s.setSection);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shapes.map((s, i) => ({ s, i, name: shapeDisplayName(s, i) })).filter((r) => !q || r.name.toLowerCase().includes(q) || KIND_LABEL[r.s.kind].toLowerCase().includes(q));
  }, [shapes, query]);

  const toolName = (s: Shape) => (s.toolId ? settings.tools.find((t) => t.id === s.toolId)?.name : undefined);

  return (
    <div className="navigator" data-testid="navigator">
      <label className="nav-search">
        <Search size={14} aria-hidden="true" />
        <input type="search" placeholder="Buscar peça…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar peça" data-testid="nav-search" />
      </label>
      {shapes.length === 0 && <p className="hint">Nenhuma peça ainda.</p>}
      <ul className="nav-list" role="listbox" aria-label="Peças (ordem de usinagem)">
        {rows.map(({ s, i, name }) => {
          const selected = selectedIds.includes(s.id);
          return (
            <li
              key={s.id}
              role="option"
              aria-selected={selected}
              className={`nav-item${selected ? " selected" : ""}${s.hidden ? " hidden" : ""}${overId === s.id ? " dragover" : ""}`}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(s.id); }}
              onDragLeave={() => setOverId(null)}
              onDrop={(e) => { e.preventDefault(); if (dragId && dragId !== s.id) moveShape(dragId, i); setDragId(null); setOverId(null); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onClick={(e) => { if (e.shiftKey) toggleSelect(s.id); else select(s.id); }}
              onDoubleClick={() => { select(s.id); setSection("shape"); }}
              data-testid={`nav-item-${i}`}
            >
              <span className="nav-kind" aria-hidden="true">{KIND_ICON[s.kind]}</span>
              {editing === s.id ? (
                <input
                  className="nav-name-input"
                  autoFocus
                  defaultValue={s.name ?? ""}
                  placeholder={name}
                  aria-label="Nome da peça"
                  data-testid="nav-rename"
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => { updateShape(s.id, { name: e.target.value.trim() || undefined }); setEditing(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(null);
                    e.stopPropagation();
                  }}
                />
              ) : (
                <span className="nav-name" title="Duplo clique no nome para renomear" onDoubleClick={(e) => { e.stopPropagation(); setEditing(s.id); }}>
                  {name}
                </span>
              )}
              {toolName(s) && <span className="nav-tool">{toolName(s)}</span>}
              <button type="button" className={`icon-button${s.hidden ? "" : " on"}`} title={s.hidden ? "Mostrar (voltar a usinar)" : "Ocultar (não usinar/exportar)"} aria-pressed={!!s.hidden} aria-label={s.hidden ? "Mostrar" : "Ocultar"} onClick={(e) => { e.stopPropagation(); updateShape(s.id, { hidden: !s.hidden }); }} data-testid={`nav-eye-${i}`}>
                {s.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button type="button" className={`icon-button${s.locked ? " on" : ""}`} title={s.locked ? "Destravar" : "Travar (não mover)"} aria-pressed={!!s.locked} aria-label={s.locked ? "Destravar" : "Travar"} onClick={(e) => { e.stopPropagation(); updateShape(s.id, { locked: !s.locked }); }} data-testid={`nav-lock-${i}`}>
                {s.locked ? <Lock size={14} /> : <LockOpen size={14} />}
              </button>
              <button type="button" className="icon-button" title="Subir na ordem" aria-label="Subir" disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveShape(s.id, i - 1); }} data-testid={`nav-up-${i}`}>
                <ArrowUp size={14} />
              </button>
              <button type="button" className="icon-button" title="Descer na ordem" aria-label="Descer" disabled={i === shapes.length - 1} onClick={(e) => { e.stopPropagation(); moveShape(s.id, i + 1); }} data-testid={`nav-down-${i}`}>
                <ArrowDown size={14} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hint">A ordem da lista é a ordem manual de usinagem (Corte → Ordem de usinagem: Manual). Arraste para reordenar.</p>
    </div>
  );
}
