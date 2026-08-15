# Amostras de G-code

Arquivos gerados pelo app, usados como referência de regressão e para conferência visual num visualizador externo (ex.: ncviewer.com).

| Arquivo | Origem | Uso |
|---|---|---|
| `baseline-v0.gcode` | Sprint 00 — retângulo 40×30 contorno 5 mm, círculo r15 pocket 3 mm, triângulo contorno 2 mm, settings padrão | Baseline (regenerado na Sprint 01 com o cabeçalho `; machine … | stock …`): o motor de percurso da Sprint 03 deve reproduzir este arquivo (diff vazio fora do cabeçalho). |

| `baseline-v1.gcode` | Sprint 06 — mesmas formas do v0 (sem compensação, `side` indefinido = "na linha") após o novo motor: ordem automática (pocket primeiro), pocket limitado pela forma real + passe de parede | Referência atual de regressão. |
| `sprint06-compensacao-tabs-rampa.gcode` | Peça 80×60 recorte por fora com 4 tabs, furo Ø20 por dentro, rebaixo 20×15, fresa Ø6, rampa 5° | Conferir visualmente: contorno externo com cantos arredondados a 3 mm da linha, tabs a Z-15,2, ordem rebaixo → furo → recorte. |

| `sprint14-grbl.gcode` / `sprint14-marlin.gcode` / `sprint14-linuxcnc.ngc` / `sprint14-linuxcnc-inch.ngc` | Sprint 14 — rebaixo 50×30 com hélice de entrada, furação Ø3 com bicadas de 4 mm (fresa 3 mm, troca), recorte 100×60 com tabs; o mesmo programa nos três pós-processadores e em polegadas (G20) | Conferir num visualizador: hélice em vez de mergulho vertical no rebaixo, ciclos de furação, troca de fresa por pausa (M0 / (MSG,…)+M0), fim M2 / M84 / M30; a versão em polegadas tem as mesmas linhas de movimento com coordenadas ÷ 25,4. |

Nota (Sprint 14): `baseline-v1` e `sprint06-…` foram regenerados — a hop entre linhas do rebaixo que encostavam na parede (retração + G0 + mergulho a cada duas linhas) deu lugar a um avanço direto ao longo da parede; o cabeçalho ganhou a linha `post … | units …` e o tempo estimado passou a considerar aceleração.

Como regenerar todos: `npx tsx docs/samples/generate-samples.ts`.

Como regenerar (a partir da raiz do projeto): `npx tsx docs/samples/generate-baseline.ts > docs/samples/baseline-v0.gcode`.
