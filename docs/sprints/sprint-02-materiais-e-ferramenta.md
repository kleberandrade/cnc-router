# Sprint 02 — Materiais e ferramenta

**Status:** planejada
**Esforço:** M (2–4 dias)
**Depende de:** 01

## Objetivo
Escolher material e fresa preenche parâmetros de corte razoáveis (avanço, mergulho, RPM, passe, stepover), com o usuário podendo sobrescrever.

## Modelo
```ts
export type MaterialId = "mdf" | "plywood" | "pine" | "aluminum" | "custom";
export interface MaterialPreset {
  id: MaterialId; label: string; advanced?: boolean;
  feedRate: number; plungeRate: number; spindleSpeed: number;
  passDepthFactor: number;   // passe = fator × Ø fresa
  stepoverFactor: number;    // fração do Ø para pocket
  notes?: string;
}
export interface MachineSettings { /* ... */ material: MaterialId; toolDiameter: number; stepover: number; overrides: Partial<Record<keyof CutParams, boolean>>; }
```
Presets (`src/lib/materials.ts`), referência fresa reta 2 cortes, router hobby — valores conservadores:

| id | Avanço | Mergulho | RPM | passe/Ø | stepover | notas |
|---|---|---|---|---|---|---|
| mdf | 1500 | 500 | 18000 | 0,5 | 0,5 | |
| plywood | 1200 | 400 | 18000 | 0,4 | 0,5 | cola desgasta fresa |
| pine | 1800 | 600 | 16000 | 0,5 | 0,5 | |
| aluminum | 300 | 100 | 10000 | 0,1 | 0,3 | fresa 1 corte, lubrificar, `advanced` |
| custom | mantém atuais | | | | | |

## Tarefas
- [ ] `lib/materials.ts` + `applyMaterial(settings, materialId)` que respeita `overrides` (campos editados manualmente não são sobrescritos até o usuário clicar "reaplicar preset").
- [ ] `stepover` calculado por material × Ø (remove o `0.6` fixo de `gcode.ts`); campo editável.
- [ ] Toolbar: seletor Material, Ø da fresa, campos de corte com indicador "manual" quando sobrescritos + botão "Restaurar preset"; alumínio marcado "avançado" com tooltip de cuidados.
- [ ] Trocar material recalcula `passDepth` sugerido; trocar Ø recalcula passe/stepover se não sobrescritos.
- [ ] Espessura da chapa (sprint 01) continua sendo padrão de `depth`; toggle "Cortar através (+0,2 mm)" por forma.
- [ ] G-code: cabeçalho inclui `; material MDF | tool Ø6 | stepover 3mm`.
- [ ] Testes: presets, `applyMaterial` com overrides, escala por Ø, header.
- [ ] E2E: selecionar "Alumínio" muda avanço para 300; editar avanço e trocar material mantém o valor editado.

## DoD específica
- Todos os quatro materiais + Personalizado selecionáveis; valores batem com a tabela.
- Campo sobrescrito manualmente sobrevive à troca de material e mostra o marcador "manual".
- Pocket usa stepover do material (teste compara nº de scanlines MDF vs alumínio).

## Fora de escopo
Biblioteca de ferramentas múltiplas (fresa por forma), refrigeração/M8.
