# Amostras de G-code

Arquivos gerados pelo app, usados como referência de regressão e para conferência visual num visualizador externo (ex.: ncviewer.com).

| Arquivo | Origem | Uso |
|---|---|---|
| `baseline-v0.gcode` | Sprint 00 — retângulo 40×30 contorno 5 mm, círculo r15 pocket 3 mm, triângulo contorno 2 mm, settings padrão | Baseline (regenerado na Sprint 01 com o cabeçalho `; machine … | stock …`): o motor de percurso da Sprint 03 deve reproduzir este arquivo (diff vazio fora do cabeçalho). |

| `baseline-v1.gcode` | Sprint 06 — mesmas formas do v0 (sem compensação, `side` indefinido = "na linha") após o novo motor: ordem automática (pocket primeiro), pocket limitado pela forma real + passe de parede | Referência atual de regressão. |
| `sprint06-compensacao-tabs-rampa.gcode` | Peça 80×60 recorte por fora com 4 tabs, furo Ø20 por dentro, rebaixo 20×15, fresa Ø6, rampa 5° | Conferir visualmente: contorno externo com cantos arredondados a 3 mm da linha, tabs a Z-15,2, ordem rebaixo → furo → recorte. |

Como regenerar todos: `npx tsx docs/samples/generate-samples.ts`.

Como regenerar (a partir da raiz do projeto): `npx tsx docs/samples/generate-baseline.ts > docs/samples/baseline-v0.gcode`.
