# Sprint 00 — Fundação

**Status:** concluída — 2026-08-15
**Esforço:** P (1–2 dias)
**Depende de:** —

## Objetivo
Deixar o projeto seguro para as sprints seguintes: CI rodando unit + e2e, inputs que não quebram a exportação, persistência básica e limpeza dos achados menores da auditoria.

## Tarefas
- [x] GitHub Actions: job `test` (`npm ci`, `lint`, `test:coverage`) e job `e2e` (`npx playwright install --with-deps chromium`, `test:e2e`), artefato do relatório Playwright.
- [x] `@types/three` → `devDependencies`.
- [x] Inputs numéricos: helper `parseNumberInput(value, fallback, {min,max})`; campo vazio/NaN mantém último valor válido; aplicar em Toolbar (feed, passe, RPM, profundidade).
- [x] `generateGCode`/`buildPassDepths`: erros viram resultado tipado `{ ok:false, errors[] }` ou são capturados na UI com mensagem inline (não `throw` solto no clique).
- [x] Substituir `window.alert` por componente `<Notice>` inline/toast (`src/components/Notice.tsx`), mantendo textos atuais (os e2e checam o texto).
- [x] Persistência: `zustand/middleware` `persist` em `useProjectStore` (chave `oficina-cnc:v1`), com `version` e `migrate` esboçados. Botão "Novo projeto" (limpa) na toolbar.
- [x] Unificar geração de id: `svgImport.ts` usa `generateShapeId` do store (ou recebe um `idFactory`); id sem `Date.now()` (usar `crypto.randomUUID()` com fallback).
- [x] `Simulator.tsx`: `totalSteps` via `useMemo`; mover `rebuiltCount` para antes do closure.
- [x] Criar `CHANGELOG.md` e `docs/samples/` (com um `.gcode` gerado do estado atual como baseline).
- [x] README: remover nota "e2e não rodaram"; adicionar badge do CI; seção "Sprints" apontando para `docs/sprints/`.

## DoD específica
- CI verde em PR (unit + e2e).
- Digitar valor vazio/0 em qualquer campo numérico e clicar "Exportar" mostra mensagem inline e não lança exceção no console.
- Recarregar a página mantém formas e settings.
- Nenhum `window.alert` restante em `src/` (grep vazio); e2e ajustados de `dialog` para o texto inline.
- Baseline `docs/samples/baseline-v0.gcode` commitado (usado como referência de regressão nas sprints 03 e 06).

## Fora de escopo
Qualquer mudança visual da toolbar (sprint 05); mesa/material.

## Notas de fechamento
- `window.confirm` mantido apenas em "Novo projeto" (ação destrutiva); nenhum `window.alert` restante.
- `docs/samples/generate-baseline.ts` regenera o baseline (`npx tsx`).
- Testes: 80 unitários (cobertura 91 % linhas / 83 % branches), 7 e2e passando no Chromium.
