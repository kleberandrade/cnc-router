import { useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { useUiStore } from "../state/uiStore";

interface Props { children: React.ReactNode; title?: string }

/** Mobile bottom sheet: half height by default, expandable, dismissible; drag the handle to expand/collapse. */
export function BottomSheet({ children, title = "Ajustes" }: Props) {
  const open = useUiStore((s) => s.sheetOpen);
  const expanded = useUiStore((s) => s.sheetExpanded);
  const setOpen = useUiStore((s) => s.setSheetOpen);
  const toggleExpanded = useUiStore((s) => s.toggleSheetExpanded);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, setOpen]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    if (dy < -40 && !expanded) toggleExpanded();
    else if (dy > 40) { if (expanded) toggleExpanded(); else setOpen(false); }
  };

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)} role="presentation">
      <section
        className={`sheet${expanded ? " expanded" : ""}`}
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        data-testid="bottom-sheet"
      >
        <div className="sheet-handle-row" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button type="button" className="sheet-handle" onClick={toggleExpanded} aria-label={expanded ? "Reduzir" : "Expandir"} data-testid="sheet-handle">
            <span className="sheet-grip" aria-hidden="true" />
          </button>
          <span className="sheet-title">{title}</span>
          <button type="button" className="icon-button" onClick={toggleExpanded} aria-label={expanded ? "Reduzir" : "Expandir"}>
            {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar" data-testid="sheet-close">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
