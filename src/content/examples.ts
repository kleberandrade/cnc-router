import type { Shape, MachineSettings } from "../types";
import { DEFAULT_MACHINE_SETTINGS } from "../types";

export interface Example {
  id: string;
  title: string;
  description: string;
  /** What the person learns by opening it. */
  teaches: string;
  build: () => { shapes: Shape[]; settings: MachineSettings };
}

const base = (over: Partial<MachineSettings> = {}): MachineSettings => ({
  ...DEFAULT_MACHINE_SETTINGS,
  material: "mdf",
  toolDiameter: 3,
  feedRate: 900, plungeRate: 300, spindleSpeed: 12000, passDepth: 3, stepover: 1.8,
  stock: { ...DEFAULT_MACHINE_SETTINGS.stock, width: 300, height: 200, thickness: 12 },
  ...over,
});

export const EXAMPLES: Example[] = [
  {
    id: "placa-furos",
    title: "Placa com 4 furos",
    description: "Placa 120 × 80 recortada por fora, furos Ø3 nos cantos por furação e um rebaixo central.",
    teaches: "Recorte por fora, furação com bicadas, rebaixo e ordem automática (rebaixo → furos → recorte).",
    build: () => ({
      settings: base({ peckDepth: 4 }),
      shapes: [
        { id: "ex-pocket", kind: "rectangle", x: 50, y: 40, width: 60, height: 30, rotation: 0, depth: 4, operation: "pocket", name: "Rebaixo central", corners: { type: "fillet", size: 4 } },
        ...([[28, 28], [132, 28], [28, 92], [132, 92]] as [number, number][]).map(([x, y], i) => ({ id: `ex-hole-${i}`, kind: "circle" as const, x, y, radius: 1.5, depth: 12.2, operation: "drill" as const, cutThrough: true, name: `Furo ${i + 1}` })),
        { id: "ex-part", kind: "rectangle", x: 20, y: 20, width: 120, height: 80, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name: "Placa", corners: { type: "fillet", size: 6 }, tabs: { count: 4, width: 8, height: 3 } },
      ],
    }),
  },
  {
    id: "porta-lapis",
    title: "Porta-lápis (encaixe)",
    description: "Base com rasgos para encaixar 4 paredes de 12 mm — todas as peças na mesma chapa.",
    teaches: "Contorno por dentro (rasgo no tamanho exato), múltiplas peças, tabs, nesting (Arranjar → Organizar).",
    build: () => {
      const wall = (id: string, x: number, y: number, name: string): Shape => ({ id, kind: "rectangle", x, y, width: 80, height: 60, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name, tabs: { count: 2, width: 6, height: 2 } });
      const slot = (id: string, x: number, y: number, w: number, h: number): Shape => ({ id, kind: "rectangle", x, y, width: w, height: h, rotation: 0, depth: 12.2, operation: "outline", side: "inside", cutThrough: true, name: "Rasgo" });
      return {
        settings: base(),
        shapes: [
          slot("ex-s1", 30, 30, 60, 12), slot("ex-s2", 30, 78, 60, 12), slot("ex-s3", 22, 46, 12, 28), slot("ex-s4", 86, 46, 12, 28),
          { id: "ex-base", kind: "rectangle", x: 10, y: 10, width: 100, height: 100, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name: "Base", corners: { type: "chamfer", size: 5 }, tabs: { count: 4, width: 8, height: 3 } },
          wall("ex-w1", 130, 10, "Parede 1"), wall("ex-w2", 130, 80, "Parede 2"), wall("ex-w3", 130, 150, "Parede 3"), wall("ex-w4", 220, 10, "Parede 4"),
        ],
      };
    },
  },
  {
    id: "letreiro",
    title: "Letreiro gravado",
    description: "Placa 200 × 70 com o texto “OFICINA” gravado a 2 mm e recorte final com cantos arredondados.",
    teaches: "Texto com fonte embarcada (letras com miolo), gravação por rebaixo, recorte por fora com tabs, simulação com remoção de material.",
    build: () => ({
      settings: base({ helixEntry: true }),
      shapes: [
        { id: "ex-text", kind: "text", x: 100, y: 45, text: "OFICINA", fontId: "inter-bold", size: 28, rotation: 0, align: "center", letterSpacing: 2, depth: 2, operation: "pocket", name: "Texto gravado" },
        { id: "ex-sign", kind: "rectangle", x: 20, y: 20, width: 160, height: 60, rotation: 0, depth: 12.2, operation: "outline", side: "outside", cutThrough: true, name: "Placa", corners: { type: "fillet", size: 8 }, tabs: { count: 4, width: 8, height: 3 } },
      ],
    }),
  },
];

export const findExample = (id: string): Example | undefined => EXAMPLES.find((e) => e.id === id);
