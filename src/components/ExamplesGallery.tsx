import { useEffect, useState, type ReactNode } from "react";
import { EXAMPLES, examplesByCategory, TAG_LABEL, type Example, type ExampleTag, type Project } from "../content/examples";
import { projectThumbnail } from "../lib/thumbnail";

/** SVG thumbnail of an example (built lazily; async examples show a placeholder until ready). */
export function ExampleThumb({ example, width = 96, height = 64 }: { example: Example; width?: number; height?: number }) {
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.resolve(example.build()).then((p) => { if (alive) setProject(p); }).catch(() => { /* thumbnail is optional */ });
    return () => { alive = false; };
  }, [example]);
  const t = project ? projectThumbnail(project.shapes, width, height) : null;
  return (
    <svg className="ex-thumb" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={4} className="ex-thumb-bg" />
      {t?.paths.map((p, i) => <path key={i} d={p.d} className={p.fill ? "ex-thumb-fill" : "ex-thumb-line"} fillRule="evenodd" />)}
    </svg>
  );
}

const DIFF = ["", "iniciante", "intermediário", "avançado"];

/** Gallery of all examples grouped by category (opened from the menu / empty state). */
export function ExamplesGallery({ onOpen, footer }: { onOpen: (id: string) => void; footer?: ReactNode }) {
  const [tag, setTag] = useState<ExampleTag | null>(null);
  const [q, setQ] = useState("");
  const match = (ex: Example) => (!tag || ex.tags.includes(tag)) && (!q.trim() || `${ex.title} ${ex.description} ${ex.teaches}`.toLowerCase().includes(q.trim().toLowerCase()));
  const groups = examplesByCategory().map((g) => ({ ...g, items: g.items.filter(match) })).filter((g) => g.items.length);
  const shown = groups.reduce((n, g) => n + g.items.length, 0);
  const tags = (Object.keys(TAG_LABEL) as ExampleTag[]).map((t) => ({ t, n: EXAMPLES.filter((e) => e.tags.includes(t)).length }));
  return (
    <div className="ex-gallery" data-testid="examples-gallery">
      <h2>Exemplos ({EXAMPLES.length})</h2>
      <p className="hint">Cada exemplo abre pronto para simular e exportar. O que ele ensina está no cartão — filtre por assunto ou busque.</p>
      <div className="ex-filters">
        <div className="ex-chips" role="group" aria-label="Filtrar por assunto">
          <button type="button" className={`chip${tag === null ? " on" : ""}`} aria-pressed={tag === null} onClick={() => setTag(null)} data-testid="ex-tag-all">Todos <span className="chip-n">{EXAMPLES.length}</span></button>
          {tags.map(({ t, n }) => (
            <button key={t} type="button" className={`chip${tag === t ? " on" : ""}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} data-testid={`ex-tag-${t}`}>{TAG_LABEL[t]} <span className="chip-n">{n}</span></button>
          ))}
        </div>
        <input type="search" className="ex-search" placeholder="Buscar exemplo…" aria-label="Buscar exemplo" value={q} onChange={(e) => setQ(e.target.value)} data-testid="ex-search" />
      </div>
      {shown === 0 && <p className="hint" data-testid="ex-empty">Nenhum exemplo com esse filtro.</p>}
      {groups.map((g) => (
        <section key={g.category} className="ex-group">
          <h3>{g.label}</h3>
          <ul className="ex-cards">
            {g.items.map((ex) => (
              <li key={ex.id}>
                <button type="button" className="ex-card" onClick={() => onOpen(ex.id)} data-testid={`gallery-${ex.id}`}>
                  <ExampleThumb example={ex} />
                  <span className="ex-card-body">
                    <span className="ex-title">{ex.title} <span className={`ex-diff ex-diff-${ex.difficulty}`}>{DIFF[ex.difficulty]}</span></span>
                    <span className="ex-desc">{ex.description}</span>
                    <span className="ex-teach">Ensina: {ex.teaches}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {footer}
    </div>
  );
}
