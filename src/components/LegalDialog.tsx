import { LEGAL, type LegalDoc } from "../content/legal";

/** Privacy / cookies / terms — plain text, readable in a dialog. */
export function LegalContent({ id }: { id: LegalDoc["id"] }) {
  const doc = LEGAL.find((d) => d.id === id)!;
  return (
    <article className="legal" data-testid={`legal-${id}`}>
      <h2>{doc.title}</h2>
      <p className="hint">Atualizado em {doc.updated}.</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h3>{s.h}</h3>
          {s.p.map((p, i) => <p key={i}>{p}</p>)}
        </section>
      ))}
    </article>
  );
}

/** Small links row used in About and in the first-visit storage notice. */
export function LegalLinks({ onOpen }: { onOpen: (id: LegalDoc["id"]) => void }) {
  return (
    <span className="legal-links">
      {LEGAL.map((d, i) => (
        <span key={d.id}>{i > 0 && " · "}<button type="button" className="link" onClick={() => onOpen(d.id)} data-testid={`open-legal-${d.id}`}>{d.title}</button></span>
      ))}
    </span>
  );
}
