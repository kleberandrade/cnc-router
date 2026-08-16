# Sprint 16 — Verificação, múltiplas operações por forma, compartilhar

**Status:** concluída — 2026-08-16 · **Versão:** 0.23.0 (executada depois da Sprint 22)
**Esforço:** M (4–6 dias)
**Depende de:** 13, 14

## O que mudou
- **Operações adicionais** (`shape.extraOps: ExtraOperation[]` — operação, profundidade, compensação, tabs, fresa, cortar através): a mesma geometria pode ter, por exemplo, rebaixo de 4 mm **e** recorte passante. Implementado como expansão (`lib/expand.ts` cria uma cópia virtual `id~k` por operação, depois da principal; `sourceId` mapeia de volta), então percurso, G-code, simulador, validação e verificação funcionam sem mudança; ordem automática continua colocando rebaixos antes dos recortes. Painel **Peça → Operações adicionais** (+ adicionar sugere o complemento: rebaixo → recorte passante com tabs; contorno → rebaixo). Store: `addExtraOp/updateExtraOp/removeExtraOp`; profundidades "através" acompanham a espessura da chapa. Sem migração (campo opcional).
- **Verificação** (`lib/verify.ts`, botão **Verificar** no simulador → diálogo): usina o percurso inteiro num heightmap e compara com o que cada **rebaixo / furo por dentro / furação** pede (região × profundidade): área e % **não alcançados** (cantos internos com raio < raio da fresa, vãos estreitos), raio mínimo possível, e **corte fora das peças** (células cortadas longe de qualquer região, descontando o alcance de 2 r dos recortes por fora). Avisos em texto quando > 2 %.
- **Compartilhar por link** (`lib/share.ts`, menu → *Copiar link do projeto* e grupo Resultado do simulador): projeto comprimido com `lz-string` em `#p=…`; ao abrir (ou colar com o app aberto — `hashchange`) carrega e limpa a URL; aviso quando o link passa de 8 k caracteres. Biblioteca de exemplos veio na Sprint 21.
- Testes: `verify.test.ts` (rebaixo retangular deixa só os cantos, vão estreito não alcançado, contorno por fora não conta como corte fora, operações adicionais verificadas), `share.test.ts` (round-trip, expansão/ids/percurso das operações extras), `Sprint16.test.tsx` (painel de operações, diálogo de verificação), e2e `sprint16.spec.ts` (rebaixo + passante no G-code, verificação, link round-trip). Total: 303 unitários, 86 e2e.

## Tarefas
- [x] Verificação pós-simulação com mapa de material restante por operação e "raio mínimo alcançável".
- [x] Operações múltiplas por forma (como `extraOps` + expansão, em vez de `operations[]` com migração v8 — mesmo resultado, muito menos risco).
- [x] Compartilhar por link + exemplos (Sprint 21).
- [x] Testes.
- [ ] Mapa visual (colorir no 3D as células não alcançadas) — fica para a Fase 5.

## DoD específica
- ✅ Verificação detecta canto interno não usinado (rebaixo retangular: só cantos; vão < fresa: > 90 % não alcançado).
- ✅ Operações múltiplas geram os dois percursos na ordem (rebaixo → recorte).
- ✅ Link round-trip (nome, formas, operações extras).
