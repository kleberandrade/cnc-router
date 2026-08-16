import type { ReactNode } from "react";

/** Small line illustrations (currentColor) for options with a visual meaning — for beginners. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const Svg = ({ children, title }: { children: ReactNode; title: string }) => (
  <svg width="34" height="26" viewBox="0 0 34 26" role="img" aria-label={title} className="opt-icon">{children}</svg>
);

export const OPTION_ICONS: Record<string, ReactNode> = {
  // tool types
  "tool-flat": <Svg title="Topo reto"><path {...S} d="M12 2h10v14l-1 4H13l-1-4z" /><path {...S} d="M12 16h10" /><path {...S} d="M4 23h26" /></Svg>,
  "tool-ball": <Svg title="Ponta esférica"><path {...S} d="M12 2h10v12a5 5 0 0 1-10 0z" /><path {...S} d="M4 23h26" /></Svg>,
  "tool-vbit": <Svg title="Fresa V"><path {...S} d="M11 2h12v8l-6 10-6-10z" /><path {...S} d="M4 23h26" /></Svg>,
  // compensation
  "side-outside": <Svg title="Por fora"><rect {...S} x="9" y="7" width="16" height="12" /><rect {...S} x="5" y="3" width="24" height="20" strokeDasharray="2 2" /></Svg>,
  "side-inside": <Svg title="Por dentro"><rect {...S} x="7" y="5" width="20" height="16" /><rect {...S} x="11" y="9" width="12" height="8" strokeDasharray="2 2" /></Svg>,
  "side-on": <Svg title="Na linha"><rect {...S} x="7" y="5" width="20" height="16" /><circle {...S} cx="27" cy="13" r="3" strokeDasharray="2 2" /></Svg>,
  // operations
  "op-outline": <Svg title="Contorno"><rect {...S} x="6" y="5" width="22" height="16" rx="2" /></Svg>,
  "op-pocket": <Svg title="Rebaixo"><rect {...S} x="6" y="5" width="22" height="16" rx="2" /><path {...S} d="M9 9h16M9 13h16M9 17h16" strokeWidth="1" /></Svg>,
  "op-drill": <Svg title="Furação"><circle {...S} cx="17" cy="13" r="8" /><path {...S} d="M17 5v16M9 13h16" strokeWidth="1" /></Svg>,
  // corners
  "corner-sharp": <Svg title="Cantos vivos"><path {...S} d="M6 22V6h22" /></Svg>,
  "corner-fillet": <Svg title="Cantos arredondados"><path {...S} d="M6 22V14a8 8 0 0 1 8-8h14" /></Svg>,
  "corner-chamfer": <Svg title="Cantos chanfrados"><path {...S} d="M6 22V14l8-8h14" /></Svg>,
  // tabs / helix / order
  tabs: <Svg title="Tabs"><path {...S} d="M3 20h8v-6h4v6h4v-6h4v6h8" /></Svg>,
  helix: <Svg title="Hélice de entrada"><path {...S} d="M8 5c6 0 12 2 12 5s-6 4-10 4 -6 3 0 4 8 2 8 5" /><path {...S} d="M4 23h26" strokeWidth="1" /></Svg>,
  plunge: <Svg title="Mergulho vertical"><path {...S} d="M17 3v16" /><path {...S} d="M12 14l5 6 5-6" /><path {...S} d="M4 23h26" strokeWidth="1" /></Svg>,
  "order-auto": <Svg title="Ordem automática"><path {...S} d="M5 19h6M5 13h12M5 7h18" /><path {...S} d="M27 5v14l3-3M27 19l-3-3" /></Svg>,
  "order-manual": <Svg title="Ordem manual"><path {...S} d="M5 7h18M5 13h18M5 19h18" /><path {...S} d="M27 9l3-3 3 3M30 6v14" /></Svg>,
};

/** Row of clickable illustrated options; mirrors a select (same value) and calls onChange. */
export function ChoiceIcons<T extends string>({ value, options, onChange, testId, disabled }: {
  value: T; options: { value: T; icon: string; label: string }[]; onChange: (v: T) => void; testId?: string; disabled?: boolean;
}) {
  return (
    <div className="choice-icons" role="radiogroup" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.label}
          title={o.label}
          className={`choice-icon${value === o.value ? " active" : ""}`}
          onClick={() => onChange(o.value)}
          disabled={disabled}
          data-testid={testId ? `${testId}-${o.value}` : undefined}
        >
          {OPTION_ICONS[o.icon]}
          <span className="choice-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
