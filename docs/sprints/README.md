# Sprints — Oficina CNC

Planejamento derivado da auditoria (`docs/auditoria.md`). Cada sprint é um arquivo `sprint-NN-*.md` com objetivo, escopo, tarefas com checkbox, DoD específica e o que fica fora.

| Sprint | Tema | Depende de | Esforço |
|---|---|---|---|
| [00](sprint-00-fundacao.md) | Fundação: CI, robustez de inputs, persistência, higiene | — | P |
| [01](sprint-01-mesa-e-base.md) | Mesa (área útil), chapa/base, origem, validação | 00 | M |
| [02](sprint-02-materiais-e-ferramenta.md) | Materiais (MDF, compensado, pinus, alumínio) e ferramenta | 01 | M |
| [03](sprint-03-motor-de-percurso-e-tempo.md) | Motor único de percurso + estimativa de tempo | 01 | M |
| [04](sprint-04-simulador.md) | Simulador: tempo real, step/step, barra de tempo, mesa/chapa em 3D | 03 | G |
| [05](sprint-05-toolbar.md) | Toolbar reorganizada, atalhos, undo/redo, status | 01, 02, 03 | M |
| [06](sprint-06-qualidade-de-usinagem.md) | Compensação de fresa, pocket real, ordem de operações, SVG melhor | 03 | G |

Ordem recomendada: 00 → 01 → 03 → 04 → 02 → 05 → 06 (mesa + simulador crível primeiro; 02 e 05 podem ser paralelizadas após 01/03).

## Definition of Done (global — vale para toda sprint)

Uma sprint só é considerada concluída quando **todos** os itens abaixo estão verdadeiros, além da DoD específica do arquivo da sprint:

1. **Build limpo**: `npm run build` (tsc -b + vite) sem erros nem warnings novos.
2. **Lint limpo**: `npm run lint` sem erros.
3. **Testes unitários**: `npm run test:coverage` passa e mantém thresholds (80 % linhas/statements/funções, 75 % branches). Nova lógica em `src/lib/*` e `src/state/*` tem teste unitário próprio.
4. **E2E**: `npm run test:e2e` passa localmente no Chromium; specs novas para fluxos de UI novos; `data-testid` existentes preservados.
5. **G-code verificado**: se a sprint toca `lib/toolpath|gcode`, um arquivo `.gcode` de exemplo foi gerado (`docs/samples/`) e conferido visualmente num visualizador externo (ex.: ncviewer.com) ou na própria simulação — cabeçalho, unidades, multi-passe e retorno ao safe height corretos.
6. **Sem regressão de UX**: fluxo básico (adicionar forma → ajustar → simular → exportar) continua funcionando manualmente.
7. **Documentação**: README atualizado (funcionalidades, arquitetura, decisões); tipos novos com JSDoc; `CHANGELOG.md` com entrada da sprint.
8. **Revisão**: PR pequeno(s) por sprint, revisado por outra pessoa (ou auto-revisão com checklist), sem `console.log`, sem `any` novo, sem `window.alert` novo.
9. **Checklist da sprint** marcado no arquivo `sprint-NN-*.md` e status atualizado no topo (`Status: concluída — data`).

## Convenções

- Unidades sempre em **mm** internamente; UI mostra unidade sufixada.
- Estado do projeto no `useProjectStore`; estado de simulação em `useSimStore` (a partir da sprint 04).
- Lógica pura em `src/lib/` (sem React); componentes só orquestram.
- Testes: `*.test.ts(x)` ao lado em `__tests__/`; e2e em `e2e/`.
- Textos de UI em pt-BR; identificadores em inglês.
