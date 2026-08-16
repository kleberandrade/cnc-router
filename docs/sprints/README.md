# Sprints — Oficina CNC

Planejamento derivado da auditoria (`docs/auditoria.md`). Cada sprint é um arquivo `sprint-NN-*.md` com objetivo, escopo, tarefas com checkbox, DoD específica e o que fica fora.

| Sprint | Tema | Depende de | Esforço |
|---|---|---|---|
| [00](sprint-00-fundacao.md) ✅ | Fundação: CI, robustez de inputs, persistência, higiene | — | P |
| [01](sprint-01-mesa-e-base.md) ✅ | Mesa (área útil), chapa/base, origem, validação | 00 | M |
| [02](sprint-02-materiais-e-ferramenta.md) ✅ | Materiais (MDF, compensado, pinus, alumínio) e ferramenta | 01 | M |
| [03](sprint-03-motor-de-percurso-e-tempo.md) ✅ | Motor único de percurso + estimativa de tempo | 01 | M |
| [04](sprint-04-simulador.md) ✅ | Simulador: tempo real, step/step, barra de tempo, mesa/chapa em 3D | 03 | G |
| [05](sprint-05-toolbar.md) ✅ | Toolbar reorganizada, atalhos, undo/redo, status | 01, 02, 03 | M |
| [06](sprint-06-qualidade-de-usinagem.md) ✅ | Compensação de fresa, pocket real, ordem de operações, SVG melhor | 03 | G |

Ordem executada: 00 → 01 → 03 → 04 → 02 → 05 → 06 — **todas concluídas em 2026-08-15**.

## Fase 2

Avaliação do feedback e plano completo em [`fase-2.md`](fase-2.md).

| Sprint | Tema | Depende de | Esforço |
|---|---|---|---|
| [07](sprint-07-interface-unificada.md) ✅ | Interface unificada (ribbon), tokens de espaçamento, ícones sem emoji | — | M |
| [08](sprint-08-responsivo-e-pwa.md) ✅ | Responsivo (celular/tablet, toque) + PWA instalável/offline | 07 | M |
| [09](sprint-09-formas-e-edicao-no-canvas.md) ✅ | Cantos de retângulo, handles, medidas inline, snap, novas formas | 07 | M/G |
| [10](sprint-10-simulador-realista.md) ✅ | Remoção de material, fresa 3D realista, ViewCube/gizmo | 07 | G |
| [11](sprint-11-navegador-e-produtividade.md) ✅ | Navegador de peças, ferramentas por peça, tema escuro, DXF | 07, 09 | M |
| [12](sprint-12-backlog.md) ✅ | Backlog priorizado → plano da Fase 3 | 07–11 | P |

Ordem executada: 07 → 08 → 10 → 09 → 11 — **Fase 2 concluída em 2026-08-15**. Próximos candidatos: [`sprint-12-backlog.md`](sprint-12-backlog.md).

## Definition of Done (global — vale para toda sprint)

Uma sprint só é considerada concluída quando **todos** os itens abaixo estão verdadeiros, além da DoD específica do arquivo da sprint. Textos novos de UI no tom de oficina (ver `AGENTS.md`).

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

## Fase 3

Plano em [`fase-3.md`](fase-3.md) (backlog da Sprint 12 convertido).

| Sprint | Tema | Depende de | Esforço |
|---|---|---|---|
| [13](sprint-13-ilhas-e-texto.md) ✅ | Pockets com ilhas e texto → contorno | — | G |
| [14](sprint-14-entrada-furacao-tempo-pos.md) ✅ | Hélice, furação, tempo com aceleração, G20 + pós-processadores | — | M |
| [15](sprint-15-nesting-e-booleanas.md) ✅ | Nesting e booleanas | 13 | G |
| [16](sprint-16-verificacao-operacoes-compartilhar.md) | Verificação de sobrecorte, múltiplas operações, compartilhar por link — **movida para o fim da Fase 4** | 13, 14 | M |
| [17](sprint-17-web-serial-sender.md) | Enviar para a máquina (Web Serial/GRBL) — **movida para a Fase 5 (backlog)** | 14 | G |

## Fase 4 — Usabilidade, UI/UX e produto

Plano em [`fase-4.md`](fase-4.md) (auditoria de UI de 2026-08-16). Ordem: 18 → 19 → 20 → 21 → 16.

| Sprint | Tema | Depende de | Esforço |
|---|---|---|---|
| [18](sprint-18-painel-e-ribbon.md) ✅ | Painel lateral em 4 seções, ribbon com overflow "Mais", escala tipográfica compacta, fim de textos cortados | — | M |
| [19](sprint-19-produto-versao-sobre.md) ✅ | Versão visível (app, G-code, PWA), Sobre com autor/licenças, Novidades | — | P |
| [20](sprint-20-feedback-vercel.md) ✅ | Sugestões e problemas: formulário → Vercel Function → Vercel Blob | 19 | M |
| [21](sprint-21-usabilidade-onboarding-a11y.md) | Estado vazio, exemplos, tour, mensagens, acessibilidade, mobile | 18 | M |
| [16](sprint-16-verificacao-operacoes-compartilhar.md) | Verificação de sobrecorte, múltiplas operações, compartilhar por link | 13, 14 | M |

## Fase 5 — Backlog

[`fase-5.md`](fase-5.md): Web Serial (Sprint 17), NFP, G2/G3, fontes do usuário, DXF com furos, i18n…
