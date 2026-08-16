# Oficina CNC — guia para agentes

Produto: **Oficina CNC**. Repo npm: `cnc-router`. Produção: `https://oficina-cnc.vercel.app`. Autor: Kleber Andrade (`pdjkleber@gmail.com`).

Sprints e DoD completa: [`docs/sprints/README.md`](docs/sprints/README.md). Tokens e layout: [`docs/design-tokens.md`](docs/design-tokens.md). Feedback/Blob: [`docs/feedback.md`](docs/feedback.md).

## Stack

Vite + React + TypeScript. Gerenciador: **npm** (não pnpm; não commitar `pnpm-lock.yaml`). Zustand (`useProjectStore`, `useSimStore`, `useUiStore`, `zundo` para desfazer), Konva (editor 2D), Three.js (simulador, chunk sob demanda), Clipper (offset/booleanas), opentype.js (texto), Vercel Function + Blob (`api/feedback.ts`).

## Arquitetura da UI (desde a Sprint 22)

- **Barra superior em 3 linhas** (`TopBar.tsx`): app bar (menu, nome do projeto, undo/redo, Exportar) → abas **Desenhar | Simular** + abas de contexto (FORMAS · USINAGEM · VISTA / REPRODUZIR) → **ribbon**. Ações da ribbon são **dados** (`RibbonGroupDef[]` em `TopBar.tsx`, renderizadas por `OverflowRibbon` em `Ribbon.tsx`): grupo tem `key/title/priority/items`; item tem `icon/label/onClick/testId/shortcut/description/featured/menu/custom`. Nunca criar botão solto na ribbon: adicione um item ao grupo/aba certa. A ribbon nunca rola: cabe → compacta (só ícones) → move grupos de menor prioridade para **Mais ▾**. O rótulo do grupo abre o menu vertical do grupo (test ids `<id>-gm`).
- **Tooltips**: `description` (1–2 linhas, tom da oficina) + `shortcut` no item → tooltip rico. Não usar `title` junto com `description`.
- **Painel lateral** (`SidePanel.tsx`): 4 abas — `shape` (Peça: navegador + seleção), `machine` (área útil + chapa + origem), `cut` (material, fresa, fresas extras, parâmetros), `post` (movimento, pós-processador, unidades). Ids antigos (`navigator/stock/material/tools`) são aliases em `uiStore.setSection`. Subgrupos com `<Group title>`; campos com `NumberField` (`hint` para texto auxiliar). Textos de `select` curtos; nada com reticências sem `title`.
- **Diálogos**: sempre `components/Dialog.tsx` (`<Dialog open onClose title size>`); confirmação/pergunta via `confirmDialog({...})` / `promptDialog({...})` (promises; `AskHost` já montado no `App`). **Proibido** `window.alert/confirm/prompt` (teste `no-native-dialogs.test.ts` falha). Avisos não bloqueantes: `Notice` (`setNotice`).
- **Origem da chapa**: `OriginPicker` (5 pontos: cantos + centro; `StockOrigin`); `originPoint()` em `lib/toolpath.ts` é a única fonte da conversão.
- **Simulador**: cores da peça vêm de `materialLook(settings.material)` (`lib/materials.ts`).
- **Tokens**: `src/index.css` — tipografia `--fs-xs/sm/md/base/lg`, `--control-h`, espaçamento `--s1..s6`; densidade/tamanho de texto via `data-density`/`data-text` no `<html>`. Nada de `font-size` fixo novo em componentes; use os tokens.

## Convenções

- Unidades internas em **mm**; a UI mostra o sufixo da unidade.
- Lógica pura em `src/lib/` (sem React). Componentes só orquestram.
- Estado do projeto em `useProjectStore` (persistido; `PROJECT_SCHEMA_VERSION` + `migrateProject` a cada mudança de forma/config); UI em `useUiStore`; simulação em `useSimStore`.
- Operações por peça: principal em `shape.operation/side/tabs/depth`; extras em `shape.extraOps` (expandidas em `lib/expand.ts` — percurso/G-code/simulador não sabem da diferença). Texto também expande em polígonos ali.
- Textos de UI em **pt-BR**; identificadores em inglês.
- **Tom da UI**: falar como alguém da oficina, não como um manual. Frases curtas, concretas, na segunda pessoa implícita (“desenhe”, “esse arquivo não abriu”). Evitar jargão de spec (“não foi possível”, “inválido”, “resultante(s)”, “ao menos uma forma”) e tom burocrático. Sem fofura, sem emoji, sem gíria. Números e unidades ficam; o resto soa falado. Vale para notices, hints, tooltips (`description`), diálogos, Sobre, README.
- Ícones: `lucide-react`. Sem emoji ou glifo unicode decorativo. Wordmark: Bricolage Grotesque (`--font-brand`); marca `BrandMark`.
- Versão: `package.json` sobe o *minor* a cada sprint fechada (`0.NN.0` = Sprint NN); a versão entra no build via `define` (`lib/version.ts`) e aparece no menu, rodapé, Sobre, G-code e PWA. Ao fechar: entrada no `CHANGELOG.md` no formato `## [0.NN.0 — Sprint NN — Tema] — data` (o diálogo Novidades lê daí) e `git tag vX.Y.Z`.
- Políticas (privacidade, cookies, termos) em `src/content/legal.ts`; produto/autor em `src/content/about.ts`; exemplos em `src/content/examples.ts`.

## Testes

- Unitários: `src/**/__tests__/*.test.ts(x)` ao lado do código; `api/__tests__` para a função de feedback.
- E2E: `e2e/`. Reutilizar `e2e/helpers.ts` (`ribbonClick` acha a ação em qualquer aba/Mais; `alignClick`). O Playwright inicia com o tour marcado como feito e o aviso de armazenamento fechado (`storageState` no config) — para testar esses fluxos, limpe as chaves no próprio teste. Preservar `data-testid` existentes; novos fluxos de UI ganham spec.
- Acessibilidade: `e2e/a11y.spec.ts` (axe, 0 violações sérias/críticas, contraste incluído) — telas novas entram lá.
- Thresholds: 80 % linhas/statements/funções, 75 % branches (`npm run test:coverage`).
- Nova lógica em `src/lib/*` e `src/state/*` tem teste unitário próprio.

## Definition of Done

Uma sprint só fecha quando tudo abaixo for verdade (além da DoD do arquivo da sprint):

1. `npm run build` limpo (sem erros nem warnings novos).
2. `npm run lint` limpo.
3. `npm run test:coverage` passa e mantém os thresholds.
4. `npm run test:e2e` passa no Chromium (mobile/tablet se tocou layout).
5. Se tocou `src/lib/toolpath.ts` ou `src/lib/gcode.ts`: sample em `docs/samples/` conferido (cabeçalho, unidades, multi-passe, safe height).
6. Fluxo básico (adicionar forma → ajustar → simular → exportar) sem regressão.
7. README + JSDoc em tipos novos + entrada no `CHANGELOG.md` + versão no `package.json` + tag.
8. Sem `console.log`, `any`, `window.alert/confirm/prompt` novos; sem `title` duplicando tooltip; sem texto cortado sem `title`.
9. Checklist marcado em `docs/sprints/sprint-NN-*.md` e `Status: concluída — data` no topo; tabela em `docs/sprints/README.md` com ✅; screenshots em `docs/sprints/img/` quando a UI mudou.

## Commits

Só commitar quando o usuário pedir. Mensagem em 1–2 frases no *why*. Não dar push a menos que peçam.
