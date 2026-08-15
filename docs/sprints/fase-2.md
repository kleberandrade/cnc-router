# Fase 2 — Avaliação do feedback e plano

**Data:** 2026-08-15 · **Base:** Fase 1 concluída (sprints 00–06, 169 testes unitários, 32 e2e).

## 1. Avaliação do feedback (o que vi nas capturas + pedidos)

| # | Feedback | Diagnóstico | Onde entra |
|---|---|---|---|
| 1 | Responsivo no celular | Layout hoje é grid fixo `320px 1fr`; a barra de ações quebra linha; painel lateral não vira gaveta; canvas Konva não trata toque/pinça; simulador exige mouse. | Sprint 08 |
| 2 | Versão PWA instalável | Não há manifest nem service worker; fontes vêm do Google Fonts (não funciona offline). | Sprint 08 |
| 3 | Navbar gastando espaço / barra mais moderna | Cabeçalho (`app-header`) só tem logo + abas Desenhar/Simular; abaixo vem outra faixa (ActionBar). Duas faixas de ~110 px. Proposta: **uma única barra estilo ribbon do Fusion**: logo compacto + abas de contexto (Desenhar · Simular) que trocam o conteúdo da própria barra + menu do projeto (novo/abrir/salvar) à esquerda + exportar à direita. | Sprint 07 |
| 4 | Unidade polegada/milímetro global | Tudo interno é mm; a UI mostra "mm" fixo. Proposta: `settings.units: "mm" \| "in"` só na **exibição/entrada** (conversão nos `NumberField`, réguas, status, simulador); G-code continua G21 (opção G20 fica para depois). | Sprint 07 |
| 5 | Padding pequeno / grudando nas bordas | Confirmado nas capturas: checkbox "Cortar através" encosta na borda do container; `panel-body` tem 10 px e o `Notice`/checkbox não têm margem inferior consistente. Precisa de escala de espaçamento (tokens 4/8/12/16/24) aplicada em todos os containers. | Sprint 07 |
| 6 | Campos na mesma linha cortando valor | Confirmado: X/Y/Z da Máquina mostram "6(", "4(", "8(" — o sufixo "mm" ocupa espaço e o input tem `min-width:0`. Regra: campo numérico nunca menor que 72 px de área de texto; linhas com 3 campos viram 2+1 abaixo de 300 px de painel; sufixo de unidade encolhe/oculta quando faltar espaço. | Sprint 07 |
| 7 | Retângulo sem opção de cantos | Modelo `RectangleShape` não tem cantos. Proposta: `corners: { type: "sharp" \| "fillet" \| "chamfer", size }` (por canto ou global), gerado em `geometry.ts` (arco amostrado / chanfro) — vale para contorno e pocket, e o offset já lida com o resultado. | Sprint 09 |
| 8 | Sem emojis na UI, usar ícones | Ainda há emojis/unicode em: controles do simulador (⏮ ⏪ ⏩ ⏭), ☰ do painel, ▸/▾ do acordeão, ⌗ do logo, × do aviso. Trocar tudo por símbolos do sprite `icons.svg` (Lucide-like, 16/20 px). | Sprint 07 |
| 9 | Simulação mostrar a perfuração acontecendo, broca realista, gizmo estilo Fusion | Hoje só o percurso muda de cor. Falta: **remoção de material** (heightmap da chapa esculpido pela fresa ao longo do tempo), **fresa 3D** (haste + pinça + porca + ponta com estrias), **ViewCube/gizmo** com faces clicáveis (Topo, Frente, Direita, Iso), órbita/pan/zoom por mouse e toque, home. | Sprint 10 |
| 10 | Inspiração Fusion 360 | Além dos itens acima: barra de contexto por aba, painel "Navegador" (árvore de peças com olho/cadeado), campo de medida inline no canvas ao criar/editar (digitar 40 Tab 30 Enter), snap a grade/centro/pontos, botão de vistas, atalhos consistentes, tema escuro. | Sprints 07, 09, 11 |

## 2. Sprints da Fase 2

| Sprint | Tema | Depende de | Esforço | Fecha os itens |
|---|---|---|---|---|
| [07](sprint-07-interface-unificada.md) | Interface unificada estilo ribbon, tokens de espaçamento, ícones (sem emoji), unidades mm/in | — | M | 3, 4, 5, 6, 8, parte do 10 |
| [08](sprint-08-responsivo-e-pwa.md) | Responsivo (celular/tablet, toque) + PWA instalável/offline | 07 | M | 1, 2 |
| [09](sprint-09-formas-e-edicao-no-canvas.md) | Cantos de retângulo (raio/chanfro), handles de redimensionar/girar, medidas inline, snap, novas formas | 07 | M/G | 7, parte do 10 |
| [10](sprint-10-simulador-realista.md) | Remoção de material (heightmap), fresa realista, ViewCube/gizmo, câmera estilo Fusion, toque | 07 | G | 9 |
| [11](sprint-11-navegador-e-produtividade.md) | Painel Navegador (árvore de peças), múltiplas ferramentas por peça, tema escuro, importar DXF | 07, 09 | M | 10 |
| [12](sprint-12-backlog.md) | Backlog priorizado (nesting, texto→contorno, hélice, aceleração no tempo, G20) | — | — | — |

Ordem recomendada: **07 → 08 → 10 → 09 → 11** (07 é base visual de tudo; 08 logo depois porque a casca nova já nasce responsiva; 10 é o item de maior valor percebido; 09 e 11 completam a experiência de desenho).

Estimativa total: ~5–7 semanas de trabalho contínuo. Cada sprint mantém a DoD global do `README.md` (build/lint/testes/e2e verdes, G-code conferido, docs e CHANGELOG, checklist marcado).

## 3. Decisões tomadas (2026-08-15)

1. **Unidades**: somente milímetros — o item "unidades mm/in" sai da Sprint 07.
2. **Layout mobile**: o que ficar melhor e mais funcional (proposta mantida: editar por toque + painel em gaveta inferior).
3. **Remoção de material**: o mais real possível; heightmap aceito (resolução adaptativa, Web Worker).
4. **Tema escuro**: tokens preparados na 07, tema ligado na 11.
5. **Ícones**: `lucide-react`.
