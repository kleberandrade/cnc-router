import { useMemo } from "react";
import { AlertTriangle, CircleCheck, OctagonAlert, Clock, Layers, Ruler } from "lucide-react";
import { useProjectStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { validateProject } from "../lib/validate";
import { buildToolpath } from "../lib/toolpath";
import { estimateTime, formatDuration } from "../lib/timing";

export function StatusBar() {
  const shapes = useProjectStore((s) => s.shapes);
  const settings = useProjectStore((s) => s.settings);
  const select = useProjectStore((s) => s.select);
  const setSection = useUiStore((s) => s.setSection);

  const issues = useMemo(() => validateProject(shapes, settings), [shapes, settings]);
  const estimatedTime = useMemo(() => {
    if (shapes.length === 0) return 0;
    try {
      return estimateTime(buildToolpath(shapes, settings).segments, { rapidRate: settings.rapidRate }).total;
    } catch {
      return 0;
    }
  }, [shapes, settings]);

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  const { workArea, stock } = settings;

  return (
    <footer className="status-bar" data-testid="status-bar">
      <span className="status-item">
        <Ruler size={13} aria-hidden="true" /> Mesa {workArea.width}×{workArea.height} · Chapa {stock.width}×{stock.height}×{stock.thickness} mm
      </span>
      <span className="status-item" data-testid="status-shapes"><Layers size={13} aria-hidden="true" /> {shapes.length} forma(s)</span>
      <span className="status-item" data-testid="toolbar-estimate"><Clock size={13} aria-hidden="true" /> tempo estimado {formatDuration(estimatedTime)}</span>
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
        <span className="status-item status-ok"><CircleCheck size={13} aria-hidden="true" /> sem avisos</span>
      )}
    </footer>
  );
}
