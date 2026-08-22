# Sprint 33 — Resistência no conjunto

**Status:** concluída — 2026-08-22 · **Versão:** 0.34.0
**Esforço:** M/G (4–6 dias)
**Depende de:** 31 (estação Resistência, solver FEM)

## Origem

Pergunta do autor (2026-08-22): a Resistência analisa as peças em separado — como simulamos no conjunto? A resposta em etapas: primeiro as peças que se encostam no desenho viram um corpo só (juntas coladas) e o FEA 2D roda na montagem; a montagem 3D com juntas fica para depois, se o uso pedir.

Vale o mesmo princípio da Sprint 31: números orientativos, honestidade absoluta. "Colado" aqui é cola ideal — junta perfeita, sem escorregar. Junta real (parafuso, encaixe com folga, cola mal espalhada) aguenta menos; o aviso diz isso.

## Proposta

### A. Colar peças que se encostam (`lib/fem/assembly.ts`)

- `glueParts(regions, tol)`: fechamento morfológico com o Clipper que o app já usa — infla cada peça `tol/2`, faz a união, defla `tol/2`. Peças encostadas (ou com folga até `tol` = 0,5 mm, a folga típica de encaixe) fundem num corpo só; os furos sobrevivem; peças longe continuam separadas, cada grupo vira uma região.
- Tudo puro, em cima de `Region` do `lib/boolean.ts`. O resto da tubulação (lados, malha, solver, worker) não muda: o conjunto colado É uma peça para o `FemJob`.

### B. Escopo Peça | Conjunto na estação

- Alternador no painel (modo "no plano"): **Peça** (como hoje) | **Conjunto** (todas as peças visíveis analisáveis, coladas).
- No Conjunto: o seletor de peça sai de cena; clicar nos lados marca apoios/cargas no contorno do conjunto; o mapa de von Mises mostra as linhas das peças originais por cima (traço fino) para as juntas ficarem visíveis.
- Se as peças formam mais de um grupo: a estação desenha os grupos e explica — "encoste as peças (folga até 0,5 mm fecha como colado)". Calcular não roda no vazio.
- Peça em 3D no Conjunto: extrusão da região colada (refatorar `extrudeShape` → `extrudeRegion`).
- Prateleira continua por peça (vão e largura são conceitos de uma chapa); mudar para Prateleira volta o escopo para Peça.

### C. Validação (de novo, o que separa isso de um brinquedo)

- Duas chapas 100×25 coladas pelo lado comprido ≡ chapa única 100×50: flecha e tensão do conjunto batem com a peça única (mesma malha ~h) dentro de ±5 %.
- Duas peças com folga 0,3 mm colam; com 5 mm não colam (2 regiões); área do colado ≈ soma das áreas; furo dentro de uma das peças sobrevive à colagem.
- E2e: duas peças encostadas → Conjunto → apoiar/carregar/Calcular → mapa e números; peças afastadas → mensagem de grupos separados.

## Como ficou

- `lib/fem/assembly.ts` (`glueParts`, `GLUE_TOL = 0,5 mm`): fechamento morfológico em cima do `Region` do `lib/boolean.ts` — infla `tol/2`, une, defla. Puro, 30 linhas, e o resto da tubulação (lados, malha, solver, worker) não mudou uma linha: o conjunto colado É uma peça para o `FemJob`.
- Estação: alternador "Uma peça | Conjunto" (aparece com 2+ peças analisáveis), seletor de peça some no Conjunto, linhas das peças originais tracejadas por cima do mapa (as juntas ficam visíveis), 3D extruda a região colada (`extrudeRegion`, refator de `extrudeShape`). Grupos separados: mensagem no palco e no Calcular, com a dica da folga. Prateleira segue por peça — mudar para ela volta o escopo.
- Validação que passou: duas chapas 100×25 coladas pelo lado comprido ≡ chapa única 100×50 — flecha dentro de ±5%; o pico de von Mises (canto engastado, singularidade sensível à malha) dentro de ±10%, tolerância declarada no teste. Folga de 0,3 mm cola, vão de 5 mm não; furos sobrevivem; áreas conferem.
- Aviso permanente ganhou a frase da junta ideal quando o escopo é Conjunto.

## DoD específica

- Validação física passa: conjunto colado ≈ peça única equivalente (±5 %).
- Nenhum cálculo no clique (mesmo worker da Sprint 31).
- Grupos separados nunca rodam por engano — a mensagem explica o que fazer.
- Aviso orientativo ganha a frase da junta ideal.
- Thresholds mantidos (82/77); DoD global do `AGENTS.md`.

## Fora do escopo

- Montagem 3D com juntas posicionadas (solver 3D, UI de montagem) — fase seguinte se o feedback pedir.
- Rigidez de junta configurável (parafuso vs cola) — a junta é sempre ideal nesta versão, com aviso.
- Materiais diferentes por peça no conjunto — o app tem um material por projeto.
- Contato unilateral / atrito / flambagem.
