# Sprint 24 — Exemplos úteis, biblioteca com categorias e ilustrações nas opções

**Status:** planejada
**Esforço:** M (4–6 dias)
**Depende de:** 21, 23

## Origem (feedback do autor, 2026-08-16)
- O menu **Exemplos** precisa de **submenu/categorias** para caber mais exemplos úteis.
- Pedidos: **tábua de carnes**, **quadro/escudo do São Paulo** e de outro time mais complexo, **placa de animal** a partir de um **SVG** (exemplo complexo de importação), além dos 3 atuais.
- Letra "A" com fresa de 1 mm com caminho estranho → era bug de rebaixo com ilha (**corrigido na Sprint 23**); não precisa de botão "recalcular": o percurso deriva sempre do estado atual — mas vale um aviso visual quando a fresa muda com peças já desenhadas ("percurso atualizado").
- Sempre que uma opção tem **variação visual** (tipo de fresa, compensação, cantos, tabs, origem, operação, hélice, ordem…), mostrar uma **ilustração** ao lado, para iniciantes.
- **Banners informativos** (Notice) no painel são grandes demais — versão compacta.

## Proposta
### A. Biblioteca de exemplos com categorias
- `src/content/examples.ts` → `Example.category: "basico" | "cozinha" | "decoracao" | "esportes" | "importado"` + `difficulty: 1–3` + `thumbnail` (SVG inline gerado das formas — `lib/thumbnail.ts` desenha o projeto em 96 × 64 a partir de `shapeToPoints`).
- Menu do projeto → **Exemplos ▸** submenu por categoria (o `.menu` ganha submenu com hover/seta; teclado ←/→) e um item **"Todos os exemplos…"** que abre um **diálogo-galeria** (`ExamplesDialog`: cards com thumbnail, título, o que ensina, dificuldade, "Abrir"). O card **Comece por aqui** mostra 3 destaques + "ver todos".
- Ao abrir: `confirmDialog` se houver peças (já existe), `zoomFit`, notice compacto com "o que este exemplo ensina".

### B. Novos exemplos (todos validam, geram G-code, cabem na chapa; testes)
1. **Tábua de carnes** (cozinha): 380 × 240 × 30 mm em pinus/compensado; contorno por fora com cantos arredondados r 20; alça com furo oblongo (rasgo por dentro 60 × 22); canaleta de suco = rebaixo de 4 mm em "moldura" (retângulo com furo → subtração) a 15 mm da borda; texto gravado opcional; tabs 6.
2. **Escudo do São Paulo** (esportes): geometria simplificada em polígonos (escudo com faixas: 3 regiões — recorte por fora do escudo, rebaixos das faixas horizontais, "SPFC" em texto Inter Bold gravado). Cores não existem no G-code — o exemplo mostra como fazer **níveis** (rebaixos de 1,5 mm e 3 mm) e o simulador mostra o relevo. Observação: escudo desenhado por nós (formas geométricas), sem usar a arte oficial (marca registrada) — dizer isso no `teaches`.
3. **Escudo mais complexo** (esportes): outro time com forma mais rica (ex.: escudo com pontas + círculo central + estrela pentagonal + texto curvo *não* — texto reto) usando booleanas (união/subtração) e um polígono desenhado; mostra `extraOps` (rebaixo + recorte).
4. **Placa de animal por SVG** (importado): SVG próprio (`public/examples/gato.svg` ou `raposa.svg`, desenhado por nós, ~20 caminhos com furos — olhos, orelhas) importado por `parseSvg` no build do exemplo (`fetch` do SVG público → `parseSvg` → shapes) — demonstra importação de SVG com furos, ordenação, `Organizar`. Como o exemplo depende de fetch, `build()` vira `async` para esse caso (os demais continuam síncronos).
5. **Caixa com encaixes** (básico, opcional): 4 paredes com dentes (finger joints) gerados por função (parâmetros: espessura, dentes) — bom para mostrar `Organizar` e tabs.
- Cada exemplo tem `teaches`, `estimatedMinutes` (tempo estimado real calculado no teste), e uma linha em `docs/sprints/exemplos.md`.

### C. Ilustrações nas opções (`components/OptionIcons.tsx`)
- Mini-SVGs (24–40 px, traço 1,5, cor `currentColor`, versão escura automática) para: tipo de fresa (reta / esférica / V), compensação (fora / dentro / na linha), operação (contorno / rebaixo / furação), cantos (vivo / raio / chanfro), tabs, hélice vs mergulho, ordem auto/manual, origem (já é visual), material (chip de cor do `materialLook`).
- Componente `ChoiceGroup` (radio visual: ícone + rótulo curto + hint) usado no painel no lugar dos `<select>` dessas opções (mantém `data-testid` e um `select` oculto? — não: o `ChoiceGroup` expõe `data-value` e os testes passam a clicar nos itens; atualizar e2e/unit correspondentes). Onde a lista é longa (material) fica o `select` com o chip de cor ao lado.
- No tooltip rico da ribbon (USINAGEM), a mesma ilustração aparece à direita da descrição (`RibbonItem.illustration`).

### D. Notice compacto
- `Notice` ganha `compact` (uma linha, ícone + título, detalhes em tooltip/expansível) e o painel usa `compact` por padrão; o notice de "exemplo aberto" some sozinho em 8 s. Mobile mantém o atual.

### E. Aviso "percurso atualizado"
- Ao mudar Ø/tipo da fresa com peças no projeto: notice compacto "Percurso e tempo recalculados para a fresa Ø X" (não bloqueia; some em 5 s).

## Modelo
```ts
interface Example { id; title; description; teaches; category; difficulty: 1|2|3; build: () => Project | Promise<Project> }
interface RibbonItem { …; illustration?: ReactNode }
Notice: { compact?: boolean; ttlMs?: number }
```

## Tarefas
- [ ] A — categorias, submenu, galeria, thumbnails, destaques no Comece por aqui.
- [ ] B — 4 (5) exemplos novos + SVG próprio + testes (validam, G-code, cabem na chapa, tempo).
- [ ] C — `OptionIcons` + `ChoiceGroup` no painel (fresa, compensação, operação, cantos, tabs, hélice, ordem) + ilustração nos tooltips da USINAGEM; e2e/unit atualizados.
- [ ] D — `Notice compact` + TTL; painel usa compacto.
- [ ] E — aviso de percurso recalculado ao trocar a fresa.
- [ ] Docs: `docs/sprints/exemplos.md` (o que cada um ensina, tempo estimado, screenshot), CHANGELOG 0.25.0, screenshots.

## DoD específica
- ≥ 7 exemplos em ≥ 4 categorias, todos abrindo em 1 clique pelo submenu e pela galeria; SVG do animal importa com furos e simula.
- Toda opção com variação visual tem ilustração ao lado (checklist na sprint).
- Notice do painel ocupa 1 linha por padrão.
- Testes: unit dos exemplos (validação, G-code, chapa), `ChoiceGroup`, thumbnails; e2e galeria/submenu/abrir; axe ok.
