# Sprint 26 — Exemplos de encaixe e uso diário + filtro na galeria

**Status:** planejada
**Esforço:** M (4–6 dias)
**Depende de:** 24, 25

## Origem (conversa com o autor, 2026-08-16)
Depois de tirar os escudos, a pergunta foi "o que mais de exemplo seria legal e útil?". A resposta que guia esta sprint: cada exemplo novo tem de **ensinar um recurso que hoje nenhum exemplo mostra** e ser algo que a pessoa com uma router de bancada realmente faz. Não é encher a galeria; é cobrir buracos: folga de encaixe, nesting, dobradiça viva, rebaixo profundo multi-passe, furação em série, relevo além da cúpula.

## Proposta

### A. Seis exemplos novos (categorias já existentes + "Encaixes")
| Exemplo | Categoria | O que ensina (novo) | Peças |
|---|---|---|---|
| **Suporte de celular** | Encaixes | Rasgo com folga = espessura da chapa + tolerância (`stock.thickness + 0.2`); duas peças que se cruzam; nesting das duas na chapa | Base com rasgo, apoio inclinado com rasgo e recorte para o cabo |
| **Caixa com encaixe de dedo (finger joint)** | Encaixes | Dentes gerados por fórmula a partir da espessura; **folga de encaixe** (0,15 mm) via offset; recorte por fora com tabs em peças pequenas; nesting das 5 faces (fundo + 4 laterais) | 5 peças, caixa 120 × 80 × 60 |
| **Dobradiça viva (kerf bending)** | Decoração | Padrão de rasgos passantes alternados que deixa o MDF flexível; rasgos repetidos por fórmula; tempo de usinagem alto e como reduzir (fresa maior, passe maior) | 1 retângulo 240 × 100 com ~60 rasgos |
| **Bandeja com divisórias** | Casa e oficina | Rebaixos profundos multi-passe (10 mm em chapa de 15), paredes finas entre bolsões (Verificação: "fresa não entra"), contorno paralelo vs zigue-zague no tempo | Placa recortada com 6 bolsões de tamanhos diferentes |
| **Descanso de panela** | Cozinha | Rasgos radiais por ângulo; **várias cópias** (2 discos) organizadas pelo nesting; hexágono | Disco Ø160 com 12 rasgos + hexágono Ø120 |
| **Gabarito de furação (sistema 32)** | Casa e oficina | Furação em série (passo 32 mm, Ø5), escala gravada com fresa V a cada 32 mm, texto pequeno; peça longa (400 mm) que testa a área útil | Régua 400 × 40 |

Nova categoria `encaixe` → **"Encaixes"** (`CATEGORY_LABEL`), fica entre "Casa e oficina" e "Importados".

### A2. Dois exemplos saem (duplicados ou simples demais)
| Sai | Por quê | Quem cobre |
|---|---|---|
| **Porta-lápis** (básico) | Rebaixos profundos multi-passe é o único conceito, e a **Bandeja com divisórias** ensina o mesmo com paredes finas e verificação | Bandeja com divisórias |
| **Placa de gato (SVG)** | Terceira "placa de animal"; furos internos por SVG já aparecem na **Pata de cachorro** e a **Raposa (imagem)** mostra furos/ilhas vetorizados | Pata (SVG) + Raposa (imagem) |

Ficam: Placa com 4 furos (é o primeiro passo do onboarding), Letreiro (texto simples com fresa reta — o Número da casa é o passo seguinte, com fresa V), Tábua, Número da casa, Relógio, Engrenagens, Raposa, Pata, Relevo. `public/examples/gato.svg` sai do repositório; estado vazio passa a destacar **Placa com 4 furos · Tábua de carnes · Suporte de celular**; testes que citam gato/porta-lápis são ajustados. Total: **15 exemplos** em 6 categorias.

Regras já valendo (Sprint 24): desenho próprio, nada de marca; `teaches` em 1–2 linhas concretas; nomes de peça em pt-BR; validam sem erro; tempo entre 10 s e 4 h; cabem na chapa padrão (300 × 200 × 12) — exceto o gabarito, que traz a própria chapa (420 × 60 × 12) e o suporte/caixa, que usam 15 mm quando fizer sentido.

### B. Folga de encaixe como conceito de primeira classe
- Helper em `content/examples.ts`: `slotFor(thickness, clearance = 0.2)` e `fingerJointEdge(len, thickness, count, clearance)` — puros, testados (`examples.test.ts`).
- Painel: no `hint` de largura de rasgo, quando a largura estiver a ±0,5 mm da espessura da chapa: "rasgo do tamanho da chapa — deixe 0,1–0,3 mm de folga para encaixar". Aviso informativo, não erro (`validate.ts`, código `slot-tight-fit`).

### C. Filtro na galeria por "o que ensina"
- Chips no topo da galeria: **Todos · Recorte · Rebaixo · Furação · Texto · Encaixe · Booleanas · Nesting · Relevo · Importação**. Derivado de um campo novo `tags: ExampleTag[]` em `Example` (obrigatório; teste garante que todo exemplo tem ≥ 1 tag e que toda tag aparece em ≥ 1 exemplo).
- Busca livre já existente por título/descrição continua; os chips filtram junto. Estado do filtro em `uiStore` (não persiste).
- Contagem no chip ("Encaixe 2").

### D. Nesting nos exemplos
- Exemplos com várias peças (suporte, caixa, descanso) já abrem **organizados** (`nestShapes` no `build()`, espaçamento 6 mm) — assim a pessoa vê o resultado do Organizar sem clicar; o `teaches` explica que dá para reorganizar.

## Modelo
```ts
type ExampleTag = "recorte" | "rebaixo" | "furacao" | "texto" | "encaixe" | "booleanas" | "nesting" | "relevo" | "importacao";
interface Example { …; tags: ExampleTag[] }
type ExampleCategory = "basico" | "cozinha" | "decoracao" | "casa" | "encaixe" | "importado";
// content/examples.ts
const slotFor = (thickness: number, clearance = 0.2) => Math.round((thickness + clearance) * 100) / 100;
function fingerJointEdge(len: number, thickness: number, count: number, clearance: number): [number, number][]  // perfil de uma aresta, origem no canto
```

## Tarefas
- [ ] A — 6 exemplos (`content/examples.ts`), thumbnails automáticas conferidas (galeria), screenshots.
- [ ] B — `slotFor` / `fingerJointEdge` + testes; aviso `slot-tight-fit` em `validate.ts` + teste.
- [ ] C — `tags` em todos os exemplos (inclusive os 9 que ficam), chips de filtro na galeria (`ExamplesGallery.tsx`), teste unitário (Sprint26.test.tsx) e e2e (filtrar → contagem → abrir).
- [ ] D — nesting no `build()` dos exemplos multi-peça.
- [ ] A2 — remover Porta-lápis e Placa de gato (`gato.svg`, EmptyState, testes Onboarding/Sprint24/examples).
- [ ] Docs: README (15 exemplos), CHANGELOG 0.27.0, `docs/sprints/README.md`, screenshots em `docs/sprints/img/sprint-26-*.png`; a11y da galeria com chips (axe).

## DoD específica
- 15 exemplos; todos validam sem erro, geram G-code, cabem na chapa, tempo entre 10 s e 4 h (teste existente cobre).
- Suporte de celular e caixa: rasgos/dentes com folga explícita (teste confere `slotFor(12) === 12.2`, dentes alternados e complementares entre faces).
- Dobradiça viva: ≥ 50 rasgos passantes, gerada por fórmula, tempo < 40 min com fresa Ø3.
- Bandeja: Verificação sem "não alcançado" nos bolsões e sem sobrecorte nas paredes.
- Galeria: chips filtram, contagem bate, filtro + busca compõem, 0 violações axe.
- e2e novo `sprint26.spec.ts`; specs anteriores continuam passando (nº de cards ≥ 11 vira ≥ 15).
