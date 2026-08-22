# Fase 5 — Backlog futuro

Itens avaliados e ainda não planejados em sprint (ordem sugerida de valor). Entram numa sprint só quando a Fase 4 fechar.

| # | Item | Origem |
|---|---|---|
| 1 | **Enviar direto para a máquina** via Web Serial (GRBL: conexão, jog, zerar, DRO, streaming com buffer, pausa/retomar) — [Sprint 17](sprint-17-web-serial-sender.md) já detalhada | Fase 3 |
| 2 | Nesting por **NFP** (no-fit polygon) para peças irregulares (hoje: caixa envolvente/MaxRects) | Sprint 15 |
| 3 | **G2/G3** (arcos reais) nos pós que suportam; hélice com G2/G3 | Sprint 14 |
| 4 | Upload de fontes `.ttf/.otf` do usuário e **"Explodir texto"** em polígonos editáveis | Sprint 13 |
| 5 | Furos inferidos no **DXF** (laços internos → holes) | Sprint 13 |
| 6 | Pós Marlin com **M106/M107** (relé) e aceleração **por eixo** ($120/$121/$122) na estimativa | Sprint 14 |
| 7 | **Templates/biblioteca de peças** (caixa com encaixe, engrenagem, letreiro) e exemplos por material | Sprint 21 |
| 8 | **i18n** (en-US) e unidades em polegadas também no editor | Fase 2 (decisão: só mm por ora) |
| 9 | Sincronização de projeto na nuvem (conta) — só se o feedback pedir; hoje tudo é local + arquivo `.json` + link | — |
| 10 | **Resistência** (Sprint 31 candidata): FEA 2D plane-stress com espessura (malha do contorno, E/Poisson por material, apoios/cargas em arestas, von Mises em Worker) + viga para flexão de prateleira + vista da peça pronta em 3D (extrusão). Plano na seção D da [Sprint 30](sprint-30-estacoes-e-folha-na-tela.md). Números orientativos, com aviso permanente. | Conversa de 2026-08-22 |
