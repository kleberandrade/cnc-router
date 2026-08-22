import { create } from "zustand";
import { useProjectStore } from "./store";
import { useDerivedStore } from "./derived";
import { projectHash } from "../lib/derivedCompute";
import { setupSheet, technicalDrawing, SHEET_CSS, type SheetPage } from "../lib/sheet";

/** `SHEET_CSS` com cada seletor prefixado por `.sheet-host` — para o preview dentro do app, sem vazar regra global (body, @page, *). */
export const SCOPED_SHEET_CSS = SHEET_CSS.split("\n")
  .filter((l) => l.trim() && !l.startsWith("@page") && !l.startsWith("* ") && !l.startsWith("body"))
  .map((l) => l.replace(/^([^{]+)\{/, (_m, sel: string) => sel.split(",").map((x: string) => `.sheet-host ${x.trim()}`).join(", ") + " {"))
  .join("\n");

/**
 * Estação "Folha técnica" (Sprint 30): as páginas prontas para ver, imprimir e baixar.
 * As folhas nunca são construídas no clique de trocar de estação — `requestSheets()` agenda a
 * montagem em idle (síncrona nos testes) e o componente mostra um placeholder enquanto isso.
 */
export interface SheetsState {
  pages: SheetPage[];
  /** Índice da página em foco. */
  current: number;
  status: "idle" | "building" | "ready";
  /** Hash (projeto + opções) das páginas em `pages`. */
  hash: string;
  withSetup: boolean;
  scope: "all" | "selected";
  scale: "auto" | "1:1";
  setCurrent: (i: number) => void;
  setWithSetup: (v: boolean) => void;
  setScope: (v: "all" | "selected") => void;
  setScale: (v: "auto" | "1:1") => void;
}

export const useSheetsStore = create<SheetsState>()((set) => ({
  pages: [],
  current: 0,
  status: "idle",
  hash: "",
  withSetup: true,
  scope: "all",
  scale: "auto",
  setCurrent: (current) => set((s) => ({ current: Math.max(0, Math.min(current, s.pages.length - 1)) })),
  setWithSetup: (withSetup) => { set({ withSetup }); requestSheets(); },
  setScope: (scope) => { set({ scope }); requestSheets(); },
  setScale: (scale) => { set({ scale }); requestSheets(); },
}));

function optionsHash(): string {
  const st = useProjectStore.getState();
  const o = useSheetsStore.getState();
  const sel = o.scope === "selected" ? st.selectedId ?? "" : "";
  return projectHash(st.shapes, st.settings, `${o.withSetup}|${o.scope}|${o.scale}|${sel}`);
}

export function buildSheetsNow(date = new Date().toLocaleDateString("pt-BR")): SheetPage[] {
  const st = useProjectStore.getState();
  const derived = useDerivedStore.getState();
  const o = useSheetsStore.getState();
  const shapes = o.scope === "selected" && st.selectedId ? st.shapes.filter((s) => s.id === st.selectedId) : st.shapes;
  const pages: SheetPage[] = [];
  if (o.withSetup) pages.push(setupSheet(st.shapes, st.settings, derived, { date }));
  pages.push(...technicalDrawing(shapes, st.settings, { scale: o.scale, date }));
  return pages;
}

const inTest = typeof globalThis !== "undefined" && "__vitest_worker__" in globalThis;
const idle = (fn: () => void) => {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (inTest) fn();
  else if (ric) ric(fn, { timeout: 500 });
  else setTimeout(fn, 50);
};

/** Reconstrói as páginas se o projeto/opções mudaram desde a última montagem. Idempotente. */
export function requestSheets(): void {
  const hash = optionsHash();
  const st = useSheetsStore.getState();
  if (st.hash === hash && st.status === "ready") return;
  useSheetsStore.setState({ status: "building" });
  idle(() => {
    // o hash pode ter mudado de novo enquanto esperava o idle: monta com o estado atual
    const fresh = optionsHash();
    const pages = buildSheetsNow();
    useSheetsStore.setState((s) => ({ pages, hash: fresh, status: "ready", current: Math.min(s.current, Math.max(0, pages.length - 1)) }));
  });
}

/** Documento completo (HTML) que vai para o iframe de impressão. */
export function sheetsDocument(pages: SheetPage[]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Oficina CNC — impressão</title><style>${SHEET_CSS}</style></head><body>${pages.map((p) => p.html).join("")}</body></html>`;
}

/** Imprime as páginas por um iframe descartável (CSS próprio, sem o tema do app). */
export function printSheets(pages = useSheetsStore.getState().pages): void {
  if (pages.length === 0 || typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.style.display = "none";
  frame.setAttribute("data-testid", "print-frame");
  document.body.appendChild(frame);
  frame.srcdoc = sheetsDocument(pages);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // o Chrome precisa do iframe vivo enquanto o diálogo do sistema está aberto
    setTimeout(() => frame.remove(), 60_000);
  };
}
