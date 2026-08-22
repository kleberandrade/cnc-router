# Sprint 31 — Resistência (análise estrutural orientativa)

**Status:** planejada · **Versão alvo:** 0.33.0 (a Sprint 32 saiu antes)
**Esforço:** G/GG (8–10 dias)
**Depende de:** 30 (dropdown de estações), 27 (worker)

## Origem

Pergunta do autor (2026-08-22, com a tela de Simulation do Fusion 360 como referência): dá para analisar resistência? Precisa de modelo 3D? A resposta técnica está na seção D da [Sprint 30](sprint-30-estacoes-e-folha-na-tela.md) — esta sprint executa aquele plano.

O princípio da sprint inteira: **números orientativos, honestidade absoluta sobre os limites**. Madeira varia de chapa para chapa; nada aqui substitui norma ou engenheiro. Esse aviso é permanente na tela, não um disclaimer escondido.

## Proposta

### A. Peça pronta em 3D (a base visual)

- `lib/extrude.ts` — puro: peça (contorno + furos + espessura; rebaixos como regiões de profundidade parcial) → malha de triângulos (topo, fundo, paredes). É o sólido implícito que o app sempre teve; sem modelador, sem passo extra do usuário.
- Vista "peça pronta" na estação (sem chapa, sem fresa): material com a cor do preset. Serve à análise e, de brinde, à conferência visual da peça.
- Reusa o chunk do Three.js já carregado pelo simulador.

### B. FEA 2D plane-stress em Worker (carga no plano da chapa)

- `lib/fem/`: malha triangular do contorno com furos (Delaunay com restrição via `poly2tri` ou triangulação própria por ear-clipping + refinamento), elementos CST, montagem da matriz de rigidez, solver direto (Cholesky esparso — projetos de bancada têm poucos milhares de nós).
- Materiais ganham **E, Poisson e densidade** nos presets (`lib/materials.ts`), com valores típicos citados no doc (MDF ~3 GPa, compensado ~7, pinus ~9 ao longo da fibra, alumínio 69) e aviso de variabilidade.
- **Apoios e cargas em arestas**: a pessoa clica numa aresta da peça e marca "apoiado" ou "carga de X kg" (direção no plano). Sem malha visível para configurar — a UI fala em kg e mm, não em nós e graus de liberdade.
- Resultado: mapa de **von Mises** (paleta viridis-like, com escala e máximo destacado), deformada exagerada opcional (como o "Deformation" do Fusion), fator simples "tensão máxima / resistência típica do material".
- Roda em `workers/fem.worker.ts` (mesmo padrão do derived: última requisição vence, hash de cache).

### C. Flexão de prateleira (carga fora do plano)

- Caso guiado, por fórmula de viga (não FEA): escolhe a peça, o vão entre apoios, a carga distribuída/pontual em kg → flecha em mm e tensão, com o limite prático "acima de vão/300 já verga visível".
- É o caso nº 1 da marcenaria e a fórmula fechada responde melhor que uma FEA mal condicionada de placa fina.

### D. Estação "Resistência"

- Quarta entrada no dropdown de estações (o terreno que a Sprint 30 preparou).
- Ribbon ANÁLISE: escolher peça, modo (no plano / prateleira), apoios/cargas, Calcular, mostrar deformada, limpar.
- Painel com os resultados numéricos + o aviso permanente.
- Mobile: visualização do resultado; configurar cargas fica no desktop nesta primeira versão.

### E. Validação (o que separa isso de um brinquedo)

- Testes contra casos com resposta fechada, com tolerância declarada:
  - viga engastada com carga na ponta (flecha e tensão vs fórmula, ±5 %);
  - placa com furo central tracionada (concentração de tensão ≈ 3×, ±15 % com malha refinada);
  - prateleira biapoiada (flecha vs fórmula de viga, ±2 %).
- Teste de malha: qualquer exemplo da galeria gera malha válida (sem triângulo degenerado, área total ≈ área da peça).
- E2e: configurar um caso na UI → resultado aparece com escala; a11y da estação.

## DoD específica

- Os três casos de validação passam dentro das tolerâncias declaradas.
- Nenhum cálculo no clique (worker, `inp.spec.ts` ganha o toque "abrir Resistência").
- O aviso orientativo está sempre visível na estação e sai junto em qualquer captura/impressão de resultado.
- Malha e solver puros em `src/lib/fem/` com testes próprios; thresholds mantidos (82/77).
- DoD global do `AGENTS.md`.

## Fora do escopo

- Placa completa (DKT) para carga fora do plano em geometria livre — a fórmula de viga cobre o caso comum; DKT só se o feedback pedir.
- Anisotropia da madeira (fibra) — E único por material nesta versão, citado no aviso.
- Contato entre peças, montagens, flambagem (o print do Fusion mostra buckling — fica registrado como possível fase 3).
- Exportar relatório da análise (pode entrar na folha técnica depois).
