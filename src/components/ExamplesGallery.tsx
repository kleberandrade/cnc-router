import { useEffect, useState, type ReactNode } from "react";
import { EXAMPLES, examplesByCategory, type Example, type Project } from "../content/examples";
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
  const groups = examplesByCategory();
  return (
    <div className="ex-gallery" data-testid="examples-gallery">
      <h2>Exemplos ({EXAMPLES.length})</h2>
      <p className="hint">Cada exemplo abre pronto para simular e exportar. O que ele ensina está no cartão.</p>
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
