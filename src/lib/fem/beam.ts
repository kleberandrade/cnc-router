/**
 * Flexão de prateleira por fórmula de viga (Sprint 31). O caso nº 1 da marcenaria: uma chapa
 * biapoiada num vão, com peso em cima. A fórmula fechada responde melhor que uma FEA 2D mal
 * posta para carga fora do plano — e dá para conferir no caderno.
 *
 * Unidades: mm, kg, MPa. Resultados orientativos: E de madeira varia por chapa e por direção
 * da fibra; o limite prático "flecha > vão/300 já verga visível" é regra de bolso de oficina.
 */

export interface BeamInput {
  /** Vão livre entre apoios, mm. */
  span: number;
  /** Largura da prateleira (perpendicular ao vão), mm. */
  width: number;
  /** Espessura da chapa, mm. */
  thickness: number;
  /** Módulo de elasticidade, MPa. */
  E: number;
  /** Carga total, kg. */
  loadKg: number;
  /** Distribuída no vão inteiro (livros) ou concentrada no meio (um vaso pesado). */
  loadType: "distributed" | "point";
}

export interface BeamResult {
  /** Flecha no meio do vão, mm. */
  deflection: number;
  /** Tensão máxima de flexão, MPa. */
  stress: number;
  /** Limite de conforto (vão/300), mm. */
  visibleLimit: number;
  /** Momento de inércia usado, mm⁴. */
  inertia: number;
}

const G = 9.81;

/** Viga biapoiada: flecha central e tensão máxima. */
export function shelfBeam(input: BeamInput): BeamResult {
  const { span: L, width: b, thickness: t, E, loadKg, loadType } = input;
  const I = (b * t ** 3) / 12;
  const F = loadKg * G; // N
  const deflection = loadType === "distributed"
    ? (5 * F * L ** 3) / (384 * E * I)   // w = F/L uniformemente distribuída
    : (F * L ** 3) / (48 * E * I);
  const M = loadType === "distributed" ? (F * L) / 8 : (F * L) / 4; // N·mm
  const stress = (M * (t / 2)) / I;
  return { deflection, stress, visibleLimit: L / 300, inertia: I };
}
