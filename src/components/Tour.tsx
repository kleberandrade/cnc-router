import { useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";
import { useUiStore } from "../state/uiStore";

export interface TourStep { target: string; title: string; text: string; section?: "shape" | "machine" | "cut" | "post" }

export const TOUR_STEPS: TourStep[] = [
  { target: '[data-testid="add-rectangle"]', title: "Barra de ações", text: "Criar formas, modificar, arranjar e ver. O que não couber fica no menu Mais ▾. Atalhos nos tooltips (R, C, T…)." },
  { target: ".panel-tabs", title: "Painel", text: "Peça (lista e medidas), Máquina (área útil e chapa), Corte (fresa e parâmetros) e Exportar (controlador e unidades).", section: "shape" },
  { target: ".editor-canvas", title: "Mesa e chapa", text: "A área clara é a chapa; a origem X0 Y0 do G-code fica no canto dela. Arraste formas, use as alças e as cotas inline." },
  { target: '[data-testid="tab-simulator"]', title: "Simular", text: "Veja a fresa percorrer o caminho com remoção de material, tempo estimado e passo a passo antes de rodar na máquina." },
  { target: '[data-testid="export-gcode"]', title: "Exportar G-code", text: "Gera o programa para o seu controlador (GRBL, Marlin, LinuxCNC). O cabeçalho traz máquina, chapa, ferramentas e tempo." },
];

export const TOUR_KEY = "oficina-cnc:tour-done";
export function tourDone(): boolean { try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return true; } }
export function markTourDone(): void { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* ignore */ } }
export function resetTour(): void { try { localStorage.removeItem(TOUR_KEY); } catch { /* ignore */ } }

/** Five coach marks anchored to real elements; Esc/close ends, "Não mostrar de novo" is implicit at the end. */
export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const setSection = useUiStore((s) => s.setSection);
  const step = TOUR_STEPS[i];

  useLayoutEffect(() => {
    if (step.section) setSection(step.section);
    const find = () => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    find();
    const t = setTimeout(find, 60);
    window.addEventListener("resize", find);
    return () => { clearTimeout(t); window.removeEventListener("resize", find); };
  }, [step, setSection]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") setI((k) => Math.max(0, k - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const finish = () => { markTourDone(); onClose(); };
  const next = () => { if (i >= TOUR_STEPS.length - 1) finish(); else setI(i + 1); };

  const pad = 6;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const box = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const below = box ? box.top + box.height + 12 : vh / 2 - 80;
  const cardTop = box && below + 180 > vh ? Math.max(12, box.top - 190) : below;
  const cardLeft = box ? Math.min(Math.max(12, box.left), vw - 340) : vw / 2 - 160;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tour ${i + 1} de ${TOUR_STEPS.length}`} data-testid="tour">
      <div className="tour-backdrop" onClick={finish} />
      {box && <div className="tour-spot" style={box} data-testid="tour-spot" />}
      <div className="tour-card" style={{ top: cardTop, left: cardLeft }}>
        <div className="tour-head">
          <span className="tour-step">{i + 1}/{TOUR_STEPS.length}</span>
          <strong>{step.title}</strong>
          <button type="button" className="icon-button" onClick={finish} aria-label="Fechar tour"><X size={14} /></button>
        </div>
        <p>{step.text}</p>
        <div className="tour-actions">
          <button type="button" className="link" onClick={finish} data-testid="tour-skip">Pular</button>
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} data-testid="tour-back">Anterior</button>}
          <button type="button" className="rb primary" onClick={next} data-testid="tour-next">{i >= TOUR_STEPS.length - 1 ? "Concluir" : "Próximo"}</button>
        </div>
      </div>
    </div>
  );
}
