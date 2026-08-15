# Amostras de G-code

Arquivos gerados pelo app, usados como referência de regressão e para conferência visual num visualizador externo (ex.: ncviewer.com).

| Arquivo | Origem | Uso |
|---|---|---|
| `baseline-v0.gcode` | Sprint 00 — retângulo 40×30 contorno 5 mm, círculo r15 pocket 3 mm, triângulo contorno 2 mm, settings padrão | Baseline (regenerado na Sprint 01 com o cabeçalho `; machine … | stock …`): o motor de percurso da Sprint 03 deve reproduzir este arquivo (diff vazio fora do cabeçalho). |

Como regenerar (a partir da raiz do projeto): `npx tsx docs/samples/generate-baseline.ts > docs/samples/baseline-v0.gcode`.
