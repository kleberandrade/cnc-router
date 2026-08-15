# Sprint 00 — Fundação

**Status:** planejada
**Esforço:** P (1–2 dias)
**Depende de:** —

## Objetivo
Deixar o projeto seguro para as sprints seguintes: CI rodando unit + e2e, inputs que não quebram a exportação, persistência básica e limpeza dos achados menores da auditoria.

## Tarefas
- [ ] GitHub Actions: job `test` (`npm ci`, `lint`, `test:coverage`) e job `e2e` (`npx playwright install --with-deps chromium`, `test:e2e`), artefato do relatório Playwright.
- [ ] `@types/three` → `devDependencies`.
- [ ] Inputs numéricos: helper `parseNumberInput(value, fallback, {min,max})`; campo vazio/NaN mantém último valor válido; aplicar em Toolbar (feed, passe, RPM, profundidade).
- [ ] `generateGCode`/`buildPassDepths`: erros viram resultado tipado `{ ok:false, errors[] }` ou são capturados na UI com mensagem inline (não `throw` solto no clique).
- [ ] Substituir `window.alert` por componente `<Notice>` inline/toast (`src/components/Notice.tsx`), mantendo textos atuais (os e2e checam o texto).
- [ ] Persistência: `zustand/middleware` `persist` em `useProjectStore` (chave `oficina-cnc:v1`), com `version` e `migrate` esboçados. Botão "Novo projeto" (limpa) na toolbar.
- [ ] Unificar geração de id: `svgImport.ts` usa `generateShapeId` do store (ou recebe um `idFactory`); id sem `Date.now()` (usar `crypto.randomUUID()` com fallback).
- [ ] `Simulator.tsx`: `totalSteps` via `useMemo`; mover `rebuiltCount` para antes do closure.
- [ ] Criar `CHANGELOG.md` e `docs/samples/` (com um `.gcode` gerado do estado atual como baseline).
- [ ] README: remover nota "e2e não rodaram"; adicionar badge do CI; seção "Sprints" apontando para `docs/sprints/`.

## DoD específica
- CI verde em PR (unit + e2e).
- Digitar valor vazio/0 em qualquer campo numérico e clicar "Exportar" mostra mensagem inline e não lança exceção no console.
- Recarregar a página mantém formas e settings.
- Nenhum `window.alert` restante em `src/` (grep vazio); e2e ajustados de `dialog` para o texto inline.
- Baseline `docs/samples/baseline-v0.gcode` commitado (usado como referência de regressão nas sprints 03 e 06).

## Fora de escopo
Qualquer mudança visual da toolbar (sprint 05); mesa/material.
