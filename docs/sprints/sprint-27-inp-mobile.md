# Sprint 27 — INP e responsividade no celular

**Status:** planejada
**Esforço:** M (4–6 dias)
**Depende de:** 24, 25, 26

## Origem (Vercel Speed Insights, 2026-08-16)
No mobile, tudo verde (FCP/LCP 0,66 s, CLS 0, FID 36 ms, TTFB 0,28 s) menos o **INP: 816 ms (P75, 3 amostras, rota "Unknown")**. INP não é carregamento: é quanto a tela demora para responder depois de um toque — trabalho pesado na thread principal dentro do handler. Três amostras é pouco (um toque lento vira o P75), mas os suspeitos são claros no código.

## Suspeitos (por ordem de probabilidade)
1. **Abrir a galeria**: o diálogo constrói os 14 exemplos e gera 14 miniaturas na hora do clique (booleanas, vetorização da raposa, relevo). No celular, centenas de ms.
2. **Percurso e validação síncronos** a cada interação (`buildToolpath` + `validateProject` no mesmo tick do evento): adicionar/mover peça, trocar Ø da fresa, abrir Verificação, abrir exemplo grande (relevo, dobradiça com 40 rasgos, caixa de dedos).
3. **Menu/ribbon** re-renderizando o app inteiro ao abrir; Konva redesenhando todas as peças numa seleção.
4. **Primeiro toque em Simular**: download do chunk do Three.js + montagem da cena.

## Proposta

### A. Medir antes de mexer
- `web-vitals` (`onINP` com `attribution`) em dev e em produção atrás de flag (`?vitals=1`) — loga alvo, tipo de evento e fases (input delay / processing / presentation) no console e, em produção, manda para o Speed Insights via `beforeSend` com `route` legível (`/editor`, `/simulador`).
- E2E `e2e/inp.spec.ts` (Playwright, projeto mobile com `CPU throttling 4×`): mede com `PerformanceObserver` de `event` a duração dos 7 toques principais — abrir menu, abrir galeria, abrir exemplo (tábua e caixa de dedos), adicionar retângulo, trocar Ø da fresa, ir para Simular, filtrar galeria. Cada um vira número no DoD (< 200 ms com throttling).
- Baseline documentado no doc antes de qualquer otimização.

### B. Galeria leve
- Miniaturas **pré-geradas em build**: `scripts/gen-thumbs.ts` roda todos os `build()` no Node e salva os `paths` (`projectThumbnail`) em `public/examples/thumbs.json` (por id, com hash do `build`); a galeria lê o JSON e só recalcula se faltar. Teste garante que o JSON está atualizado (`npm run gen:thumbs` no `prebuild`).
- Diálogo abre em < 50 ms: cartões renderizam com o placeholder e a lista aparece de imediato; nada de `build()` no clique.

### C. Percurso fora do clique
- `lib/toolpath` e `lib/validate` são puros: rodam num **Web Worker** (`workers/toolpath.worker.ts`, Vite `?worker`) com fila de 1 (a última requisição vence). Store expõe `toolpathState: idle | computing | ready` e o painel/simulador leem o resultado pronto; o clique só muda o estado.
- Memoização por hash de (peças, settings) — voltar a um estado já calculado não recalcula.
- `startTransition` para as atualizações derivadas (navegador, verificação, tempo estimado) — a resposta visual do clique (seleção, campo) sai primeiro.
- Fallback síncrono quando `Worker` não existe (testes unitários) e para projetos pequenos (< N segmentos) para não pagar o postMessage à toa.

### D. Menus, ribbon e editor
- `TopBar`: menu do projeto e menus de grupo isolados em componentes com `memo`; abrir/fechar não re-renderiza editor/painel (medir com React Profiler).
- Konva: grade/chapa/réguas em camada estática com `listening={false}` e cache; seleção altera só a camada de peças; `perfectDrawEnabled={false}` nas formas.
- `NumberField`: commit no blur/Enter (já é), mas o recálculo do percurso passa a ser assíncrono (C).

### E. Simulador
- Prefetch do chunk do Three.js em idle após o primeiro paint (`requestIdleCallback` → `import()`), sem montar a cena; o toque em Simular só monta.
- Montagem da cena em passos (`requestAnimationFrame`) para não travar o toque.

## Modelo
```ts
// state/toolpathStore.ts
interface ToolpathState { status: "idle" | "computing" | "ready"; hash: string; result?: { segments; issues; time } }
// workers/toolpath.worker.ts — recebe {shapes, settings, hash}, responde {hash, segments, issues, time}
// lib/vitals.ts — initVitals({ debug, send }) usa web-vitals onINP/onLCP/onCLS
```

## Tarefas
- [ ] A — web-vitals com atribuição (dev/flag) + `route` no Speed Insights; `e2e/inp.spec.ts` mobile com throttling; baseline no doc.
- [ ] B — `scripts/gen-thumbs.ts` + `public/examples/thumbs.json` + galeria lendo do JSON; teste de "JSON atualizado".
- [ ] C — worker de percurso/validação com fila, memo por hash, `startTransition`; fallback síncrono; testes do store.
- [ ] D — `memo` nos menus/ribbon; camadas estáticas no Konva; medir com Profiler.
- [ ] E — prefetch do Three.js em idle; montagem em passos.
- [ ] Docs, CHANGELOG 0.28.0, `docs/sprints/README.md`, antes/depois no doc (tabela dos 7 toques).

## DoD específica
- Os 7 toques do `e2e/inp.spec.ts` < 200 ms com CPU 4× no projeto mobile (galeria < 50 ms para aparecer).
- Nenhum `buildToolpath`/`validateProject` no mesmo tick de um evento de UI (asserção no teste do store).
- Miniaturas vêm do JSON pré-gerado; teste falha se o JSON estiver desatualizado.
- Sem regressão nos e2e existentes; cobertura mantida.
- Após deploy: acompanhar Speed Insights por 7 dias — meta INP P75 < 200 ms no mobile.
