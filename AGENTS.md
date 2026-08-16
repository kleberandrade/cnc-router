# Oficina CNC — guia para agentes

Produto: **Oficina CNC**. Repo npm: `cnc-router`. Produção: `https://oficina-cnc.vercel.app`.

Sprints e DoD completa: [`docs/sprints/README.md`](docs/sprints/README.md). Tokens e layout: [`docs/design-tokens.md`](docs/design-tokens.md).

## Stack

Vite + React + TypeScript. Gerenciador: **npm** (não pnpm; não commitar `pnpm-lock.yaml`). Zustand (`useProjectStore`, `useSimStore`), Konva (editor 2D), Three.js (simulador, chunk sob demanda).

## Convenções

- Unidades internas em **mm**; a UI mostra o sufixo da unidade.
- Lógica pura em `src/lib/` (sem React). Componentes só orquestram.
- Estado do projeto em `useProjectStore`; simulação em `useSimStore`.
- Textos de UI em **pt-BR**; identificadores em inglês.
- Ícones: `lucide-react`. Sem emoji ou glifo unicode decorativo. Avisos via `Notice`, nunca `alert()`.
- Tokens em `src/index.css`. Wordmark: Bricolage Grotesque (`--font-brand`).

## Testes

- Unitários: `src/**/__tests__/*.test.ts(x)` ao lado do código.
- E2E: `e2e/`. Preservar `data-testid` existentes; novos fluxos de UI ganham spec.
- Thresholds: 80 % linhas/statements/funções, 75 % branches (`npm run test:coverage`).
- Nova lógica em `src/lib/*` e `src/state/*` tem teste unitário próprio.

## Definition of Done

Uma sprint só fecha quando tudo abaixo for verdade (além da DoD do arquivo da sprint):

1. `npm run build` limpo (sem erros nem warnings novos).
2. `npm run lint` limpo.
3. `npm run test:coverage` passa e mantém os thresholds.
4. `npm run test:e2e` passa no Chromium.
5. Se tocou `src/lib/toolpath.ts` ou `src/lib/gcode.ts`: sample em `docs/samples/` conferido (cabeçalho, unidades, multi-passe, safe height).
6. Fluxo básico (adicionar forma → ajustar → simular → exportar) sem regressão.
7. README + JSDoc em tipos novos + entrada no `CHANGELOG.md`.
8. Sem `console.log`, `any` ou `window.alert` novos.
9. Checklist marcado em `docs/sprints/sprint-NN-*.md` e `Status: concluída — data` no topo.

## Commits

Só commitar quando o usuário pedir. Mensagem em 1–2 frases no *why*. Não dar push a menos que peçam.
