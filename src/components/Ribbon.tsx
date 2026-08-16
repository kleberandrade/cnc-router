import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";

export const ICON = 18;

export interface RibbonItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  testId?: string;
  title?: string;
  /** Extra class for the label (e.g. mono zoom readout). */
  labelClass?: string;
  /** Sub-items: renders a dropdown button instead of a plain button. */
  menu?: RibbonItem[];
}

export interface RibbonGroupDef {
  key: string;
  title: string;
  /** Lower = kept visible longer when space is short. */
  priority: number;
  items: RibbonItem[];
}

export function RibbonButton({ icon, label, onClick, disabled, active, testId, title, labelClass, primary }: RibbonItem & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={`rb${active ? " active" : ""}${primary ? " primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={title ?? label}
      data-testid={testId}
    >
      <span className="rb-icon">{icon}</span>
      <span className={`rb-label${labelClass ? ` ${labelClass}` : ""}`}>{label}</span>
    </button>
  );
}

/** Popover menu anchored to a button; closes on outside click / Esc. */
function Popover({ open, onClose, children, align = "left" }: { open: boolean; onClose: () => void; children: ReactNode; align?: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={`menu ribbon-menu${align === "right" ? " menu-right" : ""}`} role="menu">
      {children}
    </div>
  );
}

function MenuItem({ item, onDone }: { item: RibbonItem; onDone: () => void }) {
  return (
    <button
      type="button"
      className={`menu-item${item.active ? " active" : ""}`}
      role="menuitem"
      onClick={() => { item.onClick(); onDone(); }}
      disabled={item.disabled}
      title={item.title ?? item.label}
      data-testid={item.testId}
    >
      <span className="menu-icon">{item.icon}</span>
      {item.title && item.title !== item.label ? item.title : item.label}
    </button>
  );
}

/** Ribbon button with a dropdown of sub-items (e.g. Alinhar ▾). */
function RibbonDropdown({ item }: { item: RibbonItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rb-dropdown">
      <button
        type="button"
        className={`rb${open ? " active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        disabled={item.disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title={item.title ?? item.label}
        data-testid={item.testId}
      >
        <span className="rb-icon">{item.icon}</span>
        <span className="rb-label"><span className="rb-label-text">{item.label}</span> <ChevronDown size={10} /></span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)}>
        {item.menu!.map((sub, i) => <MenuItem key={sub.testId ?? i} item={sub} onDone={() => setOpen(false)} />)}
      </Popover>
    </div>
  );
}

export function RibbonGroup({ title, items, className }: { title: string; items: RibbonItem[]; className?: string }) {
  return (
    <div className={`rgroup${className ? ` ${className}` : ""}`} role="group" aria-label={title}>
      <div className="rgroup-items">
        {items.map((it, i) => (it.menu ? <RibbonDropdown key={it.testId ?? i} item={it} /> : <RibbonButton key={it.testId ?? i} {...it} />))}
      </div>
      <div className="rgroup-title" title={title}>{title}</div>
    </div>
  );
}

const MORE_WIDTH = 52;

/**
 * Ribbon that never scrolls: measures the available width and moves the lowest-priority
 * groups into a "Mais ▾" menu (same actions, same test ids) when they don't fit.
 */
export function OverflowRibbon({ groups, label = "Ações" }: { groups: RibbonGroupDef[]; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  /** Measured widths per group, for the labelled and the compact (icons-only) rendering. */
  const widths = useRef({ full: new Map<string, number>(), compact: new Map<string, number>() });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [compact, setCompact] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cache = compact ? widths.current.compact : widths.current.full;
    el.querySelectorAll<HTMLElement>("[data-rgroup]").forEach((g) => {
      const w = g.getBoundingClientRect().width;
      if (w > 0) cache.set(g.dataset.rgroup!, w);
    });
    const gap = 8;
    const keys = groups.map((g) => g.key);
    const known = (m: Map<string, number>) => keys.every((k) => m.has(k));
    if (!known(cache) || available <= 0) {
      if (hidden.size) setHidden(new Set()); // render everything so it can be measured
      return;
    }
    const sum = (m: Map<string, number>) => keys.reduce((s, k) => s + (m.get(k) ?? 0) + gap, 0);
    // 1) everything fits with labels → labelled, nothing hidden
    if (known(widths.current.full) && sum(widths.current.full) <= available) {
      if (compact) setCompact(false);
      if (hidden.size) setHidden(new Set());
      return;
    }
    // 2) try icons-only before hiding anything
    if (!compact) { setCompact(true); if (hidden.size) setHidden(new Set()); return; }
    if (sum(widths.current.compact) <= available) { if (hidden.size) setHidden(new Set()); return; }
    // 3) compact + overflow by priority
    const width = (k: string) => (widths.current.compact.get(k) ?? 0) + gap;
    const byPriority = [...groups].sort((a, b) => a.priority - b.priority);
    const visible: string[] = [];
    let need = MORE_WIDTH;
    for (const g of byPriority) {
      if (need + width(g.key) <= available || visible.length === 0) { visible.push(g.key); need += width(g.key); }
      else break;
    }
    const next = new Set(keys.filter((k) => !visible.includes(k)));
    const same = next.size === hidden.size && [...next].every((k) => hidden.has(k));
    if (!same) setHidden(next);
  }, [groups, available, hidden, compact]);

  const hiddenGroups = groups.filter((g) => hidden.has(g.key));
  return (
    <div className={`ribbon${compact ? " compact" : ""}`} role="toolbar" aria-label={label} ref={ref}>
      {groups.filter((g) => !hidden.has(g.key)).map((g) => (
        <div key={g.key} data-rgroup={g.key} className="rgroup-wrap">
          <RibbonGroup title={g.title} items={g.items} className={`rgroup-${g.key}`} />
        </div>
      ))}
      {hiddenGroups.length > 0 && (
        <div className="rgroup rgroup-more rb-dropdown" role="group" aria-label="Mais ações">
          <div className="rgroup-items">
            <button type="button" className={`rb${moreOpen ? " active" : ""}`} onClick={() => setMoreOpen((o) => !o)} aria-haspopup="menu" aria-expanded={moreOpen} title="Mais ações" data-testid="ribbon-more">
              <span className="rb-icon"><MoreHorizontal size={ICON} /></span>
              <span className="rb-label">Mais</span>
            </button>
          </div>
          <div className="rgroup-title">…</div>
          <Popover open={moreOpen} onClose={() => setMoreOpen(false)} align="right">
            {hiddenGroups.map((g) => (
              <div key={g.key} className="menu-group" data-testid={`more-${g.key}`}>
                <div className="menu-title">{g.title}</div>
                {g.items.flatMap((it) => (it.menu ? it.menu : [it])).map((it, i) => (
                  <MenuItem key={it.testId ?? i} item={it} onDone={() => setMoreOpen(false)} />
                ))}
              </div>
            ))}
          </Popover>
        </div>
      )}
    </div>
  );
}
