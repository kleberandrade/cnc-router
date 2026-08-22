import { versionLabel, buildLabel } from "../lib/version";
import { AlertTriangle, CircleCheck, OctagonAlert, Clock, Layers, Ruler } from "lucide-react";
import { useProjectStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { formatDuration } from "../lib/timing";
import { useDerived } from "../state/derived";

export function StatusBar() {
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const select = useProjectStore((s) => s.select);
  const setSection = useUiStore((s) => s.setSection);
  // Validation and time come from the derived store (computed off the click path — Sprint 27).
  const issues = useDerived((d) => d.issues);
  const estimatedTime = useDerived((d) => d.time);
  const status = useDerived((d) => d.status);

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  const { workArea, stock } = settings;

  return (
    <footer className="status-bar" data-testid="status-bar">
      <span className="status-item">
        <Ruler size={13} aria-hidden="true" /> Mesa {workArea.width}×{workArea.height} · Chapa {stock.width}×{stock.height}×{stock.thickness} mm
      </span>
      <span className="status-item" data-testid="status-shapes"><Layers size={13} aria-hidden="true" /> {shapes.length} {shapes.length === 1 ? "peça" : "peças"}</span>
      <span className={`status-item${status === "computing" ? " status-computing" : ""}`} data-testid="toolbar-estimate" data-status={status}><Clock size={13} aria-hidden="true" /> tempo estimado {formatDuration(estimatedTime)}</span>
      {issues.length > 0 ? (
        <details className="status-issues" data-testid="issues">
          <summary className={`status-item ${errors ? "issue-error" : "issue-warning"}`} data-testid="issues-summary">
            {errors ? <OctagonAlert size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}{" "}
            {errors ? `${errors} erro(s)` : ""}
            {errors && warnings ? " · " : ""}
            {warnings ? `${warnings} aviso(s)` : ""}
          </summary>
          <ul className="issue-list">
            {issues.map((i, idx) => (
              <li key={idx} className={`issue issue-${i.level}`}>
                {i.shapeId ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      select(i.shapeId!);
                      setSection("shape");
                    }}
                  >
                    {i.message}
                  </button>
                ) : (
                  i.message
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <span className="status-item status-ok"><CircleCheck size={13} aria-hidden="true" /> tudo certo</span>
      )}
      <span className="status-item status-version" title={buildLabel()} data-testid="status-version">{versionLabel()}</span>
    </footer>
  );
}
