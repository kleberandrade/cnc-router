# Sprint 34 — Conjunto de verdade

**Status:** concluída — 2026-08-22 · **Versão:** 0.35.0
**Esforço:** M (2–3 dias)
**Depende de:** 33

## Origem

Teste do autor com a tábua de carnes (2026-08-22, com print): no escopo Conjunto não dava para analisar, o 3D mostrava "uma peça" e ficou a pergunta: a folha técnica não deveria considerar o conjunto também? Três causas encontradas:

1. **Cantos arredondados fundem os lados.** `boundarySides` só quebra lado em canto vivo (> 30°); numa peça de cantos arredondados a curva suave emenda tudo e o contorno inteiro vira um lado só — impossível marcar apoio E carga.
2. **A união não sabe o que é recorte.** O conjunto unia toda geometria como material: o rasgo da alça (contorno por dentro, passante) sumia em vez de virar furo. Por isso o 3D também saía "maciço", parecendo uma peça só.
3. **A folha técnica só desenha peça por peça** — não existia a página do conjunto montado.

## Proposta

### A. Lados que respeitam cantos arredondados (`lib/fem/mesh.ts`)

- `boundarySides` ganha acúmulo de curvatura: além do canto vivo, um lado novo começa quando a direção derivou mais de ~60° desde o início do lado. Cantos arredondados passam a separar as arestas retas em lados distintos.
- Laço uniforme (círculo amostrado: arestas de comprimento parecido, sem canto vivo) continua **um lado só** — carregar a borda de um furo redondo segue um clique.

### B. Conjunto com semântica de corte (`lib/fem/assembly.ts`)

- `partitionShapes(shapes, thickness)`: contorno **por fora** = peça (sólido); **furação** e contorno/rebaixo **por dentro que atravessam a chapa** = recorte descontado; rebaixo parcial e gravação não mudam o contorno (limitação declarada no aviso). `extraOps` valem pela própria operação.
- `assembleShapes`: cola os sólidos e subtrai os recortes — a tábua no Conjunto vira a chapa com o rasgo da alça descontado. O 3D extruda isso.

### C. Folha técnica do conjunto (`lib/sheet.ts` + `state/sheets.ts`)

- Página "Conjunto (peças coladas)" com o desenho cotado do contorno montado (furos descontados incluídos), numerada junto das outras. Só aparece quando o conjunto difere das peças soltas (algo colou ou algo foi descontado).

### D. Validação

- Unit: retângulo de cantos arredondados tem ≥ 4 lados e lados opostos distintos; círculo segue 1 lado; tábua-like (chapa + rasgo passante + rebaixo parcial) vira 1 região com 1 furo e área correta; folha do conjunto aparece/some nas condições certas.
- E2e com a tábua de carnes real: Conjunto → apoiar um lado, carregar o outro → resultado; página "Conjunto" na estação Folha técnica.

## Como ficou

- `boundarySides` ganhou o acúmulo de curvatura (~60° desde o início do lado abre lado novo) com a exceção do laço uniforme (círculo amostrado = 1 lado, mesh test antigo intacto). O teste novo usa exatamente o caso do print: retângulo de cantos arredondados com lados opostos distintos.
- `partitionShapes`/`assembleShapes` em `lib/fem/assembly.ts`: contorno por fora = sólido; furação e passante por dentro = recorte descontado (furação cega não desconta); rebaixo parcial e gravação ficam de fora — texto gravado nem expande (não precisa das fontes). A análise, o 3D e a folha usam a mesma conta.
- Folha técnica: `assemblyDrawingShapes` gera a peça sintética do conjunto e ela entra no fim do `technicalDrawing`, numerada junto; some quando nada colou e nada foi descontado (sem página duplicada).
- Verificado no fluxo do print: tábua de carnes → Conjunto → apoiar esquerda, carregar direita → mapa com o rasgo da alça descontado; 3D mostra a tábua com o furo; folha ganha "Desenho — Conjunto" com 380 × 210 e o rasgo 22 × 60.
- Specs que contavam páginas fixas da folha (sprint30, mobile) atualizadas: as formas padrão se sobrepõem e agora colam numa página extra.

## Ajuste pós-sprint (v0.35.1)

Print do autor: marcou o lado apoiado e "a análise não inicia" — a mensagem de erro antiga ficava na tela e nada dizia que faltava o passo da carga. Agora `toggleSide`/carga/direção limpam o erro e disparam a análise sozinha quando apoio + carga estão marcados (worker last-wins; nos testes o fallback síncrono responde na volta da ação); um guia de passos (`an-guide`) mostra "1 de 2 / 2 de 2 / Calculando…" e o Calcular vira o botão de rodar de novo.

## DoD específica

- O fluxo do print do autor funciona: tábua de carnes → Conjunto → apoiar/carregar → mapa com o rasgo descontado.
- Círculo continua um lado (mesh test antigo passa sem mudança).
- Folha do conjunto não duplica página quando não há colagem nem recorte.
- Thresholds mantidos; DoD global do `AGENTS.md`.

## Fora do escopo

- Rebaixo parcial como redução de espessura na análise (placa de rigidez variável) — registrado como limitação.
- Selecionar quais peças entram no conjunto — entram todas as visíveis, como na Sprint 33.
