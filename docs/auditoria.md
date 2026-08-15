# Auditoria — Oficina CNC (cnc-router)

Escopo: leitura completa de `src/`, `e2e/`, configs de build/teste e README. Nenhum arquivo do projeto foi alterado. Os testes unitários não puderam ser executados a partir daqui (o `node_modules` está compilado para macOS e o ambiente de leitura é Linux) — a análise abaixo é estática.

## 1. Estado atual em uma frase

Base sólida e enxuta (Vite + React + TS, Zustand, Konva, Three.js, ~700 linhas de código de produto, boa cobertura de `lib/`), mas ainda é um protótipo: a máquina não tem noção de mesa nem de material, a barra de ferramentas mistura formas/propriedades/máquina numa coluna só e o simulador é um "GIF" — anda por índices de ponto sem tempo real, sem step, sem barra de progresso.

## 2. Achados da auditoria (por gravidade)

### Críticos (afetam o G-code / a máquina)

**A1. Sem limites de mesa — G-code pode mandar a fresa além do curso.** Nada em `types.ts`/`store.ts` modela a mesa. O editor tem um canvas fixo de 640×480 px a 3 px/mm (≈213×160 mm) que não representa máquina nenhuma, e é possível arrastar formas para fora dele. Sem validação, o `generateGCode` gera coordenadas negativas ou maiores que o curso sem aviso.

**A2. Simulador ignora o G-code real.** `buildSimulationPath` (Simulator.tsx) reconstrói o percurso por conta própria: um único mergulho até `-depth` (ignora `passDepth`/multi-passe), ignora pocket (usa contorno sempre), ignora `safeHeight` entre travessias exceto no início/fim. Ou seja, o que se vê simulado não é o que se exporta. Isso é a raiz de todos os pedidos de melhoria do simulador: para ter tempo total confiável, a simulação precisa nascer do mesmo percurso que vai para a máquina.

**A3. Pocket sem compensação de ferramenta e sem contorno de acabamento.** `pocketToolpath` faz scanlines sobre o bounding box (não sobre a forma — círculo em pocket vira quadrado) e as linhas vão de `minX` a `maxX` com o centro da fresa, então a fresa invade `toolDiameter/2` para fora da forma. Contorno também não tem offset (interno/externo), o que para peça real dá erro dimensional de um diâmetro de fresa.

**A4. Ordem das operações no G-code.** As formas são cortadas na ordem de inserção. Um pocket dentro de um contorno de recorte, se o contorno vier antes, solta a peça antes do pocket. Não é bug de código, mas é uma armadilha para o usuário; vale ao menos ordenar pocket → contorno, ou avisar.

**A5. Sem `plungeRate` de fato entre passes de pocket, e Z nunca sobe entre linhas de scanline** — em madeira ok, em alumínio o `G1 X` a `feedRate` no retorno de linha com fresa enterrada é aceitável, mas a transição entre passes com `G1 Z` sem retorno ao início da primeira linha começa o próximo passe do fim da última linha (fine, só documentar).

### Importantes (UX / robustez)

**B1. `settings.plungeRate`, `safeHeight` e `toolDiameter` existem no store mas não têm UI.** O usuário não consegue trocar a fresa nem a altura segura. Diâmetro da fresa é essencial para material/pocket.

**B2. Editor não redimensiona nem rotaciona; path SVG não é arrastável** (`Line` sem `draggable`) — formas importadas ficam presas onde caíram. Não há zoom/pan; canvas de tamanho fixo em px, não em mm.

**B3. `Number(e.target.value)` sem validação** — campo vazio vira `0` e `buildPassDepths` lança `Error("passDepth must be > 0")` na exportação sem tratamento na UI (crash silencioso no console; o download não acontece e o usuário não sabe por quê). Mesmo com `depth`.

**B4. `window.alert` para erros e sem persistência de projeto** (recarregou, perdeu tudo). `localStorage` via `zustand/middleware persist` resolve em 5 linhas.

**B5. SVG import assume unidade = mm** e ignora `viewBox`/`transform`; um SVG exportado do Inkscape em px vem 3,78× errado. Curvas são descartadas silenciosamente (só `console.warn` prometido no comentário — na prática nem isso: o `default` só pula um token e pode dessincronizar o parser).

**B6. `generateShapeId` usa `Date.now()`** — colisão improvável mas ids não são estáveis para persistência; e `svgImport.ts` tem um segundo contador de id (`rect-1`) que colide com o do store se ambos gerarem prefixo igual (o do store inclui timestamp, então hoje não colide, mas são duas fontes de verdade).

### Menores

**C1.** `Simulator.tsx` recalcula `buildSimulationPath` a cada render só para obter `totalSteps` (linha `const totalSteps = ...`) — deveria vir de `useMemo`.
**C2.** Efeito de animação com `rebuiltCount` declarado depois de ser usado no closure (funciona por hoisting de `let` dentro do escopo, mas é confuso).
**C3.** `Toolbar` botão "Exportar" tem `margin-top:auto` só quando não há seção "Propriedades" longa; layout quebra em telas baixas (toolbar tem `overflow-y:auto`, ok, mas o botão sai da vista).
**C4.** `@types/three` está em `dependencies` (deveria ser `devDependencies`).
**C5.** README promete "Salvar/carregar" e "nesting" como futuro — alinhar com o plano abaixo.
**C6.** Fontes do Google carregadas via `<link>` — app deixa de ser 100% offline; opcional auto-hospedar.
**C7.** `README` diz "64 testes" — vale colocar um badge/CI para não desatualizar.

### O que está bom (manter)

Separação `lib/` pura vs. componentes; testes de `gcode`/`geometry`/`svgImport`/`store` legíveis e rápidos; decisão explícita de deixar canvas/WebGL para Playwright; G-code GRBL correto no básico (G21/G90, M3/M5, multi-passe com passe final exato, retorno ao início do loop a cada passe); CSS com tokens e foco visível.

## 3. Plano de implementação

Organizado em 5 entregas incrementais. Cada uma fecha com testes e pode ir para produção sozinha. Estimativas são de esforço relativo (P/M/G).

### Entrega 1 — Mesa, base e origem (M)

Objetivo: o usuário escolhe a máquina/área útil e o material bruto (a "base"/chapa), e tudo (editor, validação, G-code, simulador) passa a respeitar isso.

Modelo (`types.ts`):

```ts
export interface WorkArea {          // curso útil da máquina
  width: number; height: number;     // X, Y em mm
  zTravel: number;                   // curso Z, mm
}
export interface Stock {             // chapa/bloco fixado na mesa
  width: number; height: number; thickness: number;  // mm
  originX: number; originY: number;  // offset da chapa em relação ao zero da máquina
  origin: "front-left" | "center";   // onde está o X0 Y0 do G54
}
export interface MachineSettings { ...existentes; workArea: WorkArea; stock: Stock; }
```

Presets de máquina (nomes comuns): 3018 (300×180×45), 3040 (300×400×80), 6040 (600×400×80), 6090 (600×900×100), 1010 (1000×1000×120), 1325 (1300×2500×150) + "Personalizada".

Comportamentos:
- Editor: o canvas passa a ser a mesa (`workArea`) com escala calculada para caber no viewport (`fit`), grade a cada 10 mm com linhas maiores a cada 50/100 mm, régua nas bordas, retângulo da chapa (`stock`) desenhado em tom bege/madeira sobre a mesa; formas fora da chapa ficam com contorno âmbar, fora da mesa vermelho.
- Store: `dragBoundFunc` no Konva para limitar arrasto ao `workArea`; `validateProject(shapes, settings)` em `lib/validate.ts` retorna lista de avisos/erros (fora da mesa, `depth > stock.thickness`, `depth > zTravel`, `passDepth <= 0`).
- G-code: `generateGCode` recebe o resultado da validação — bloqueia exportação com erros e escreve os avisos como comentários no cabeçalho (`; stock 300x200x18mm MDF`).
- Persistência: `zustand persist` em `localStorage` (chave `oficina-cnc:v1`) para settings + formas.
- Testes: `validate.test.ts` (fora da mesa, profundidade > espessura), snapshot do cabeçalho do G-code, `store` com presets.

### Entrega 2 — Materiais e ferramenta (M)

Objetivo: escolher material e fresa preenche parâmetros de corte razoáveis; o usuário pode ajustar depois.

`lib/materials.ts` com presets (valores conservadores para fresas de topo reto/2 cortes em routers hobby; ajustáveis na UI):

| Material | Ø fresa ref. | Avanço (mm/min) | Mergulho (mm/min) | RPM | Passe (mm) | Obs. |
|---|---|---|---|---|---|---|
| MDF | 6 | 1500 | 500 | 18000 | 3 | poeira fina, ok passes fundos |
| Compensado | 6 | 1200 | 400 | 18000 | 2,5 | cola desgasta fresa |
| Pinus / madeira macia | 6 | 1800 | 600 | 16000 | 3 | |
| Alumínio (6061/5052) | 3 | 300 | 100 | 10000 | 0,3 | 1 corte, lubrificar, stepover 30 % |
| Personalizado | — | valores atuais | | | | |

Regra de escala: `passDepth` sugerido = fator × Ø fresa (MDF 0,5; comp. 0,4; pinus 0,5; alumínio 0,1) para o preset se adaptar quando o usuário trocar o diâmetro. Stepover do pocket passa a ser por material (madeira 50 %, alumínio 30 %) em vez do fixo `0.6` em `gcode.ts`.

UI: seletor "Material" + campo "Espessura" (alimenta `stock.thickness` da Entrega 1) + campo "Ø da fresa"; ao trocar material aparece um pequeno aviso "parâmetros de corte atualizados — revise". Espessura da chapa passa a ser o padrão de `depth` para novas formas em contorno (recorte passante) com 0,2 mm de sobre-corte opcional ("cortar através").

Testes: tabela de presets, escala de passe pelo diâmetro, `applyMaterial` não sobrescreve campos que o usuário marcou como "manual".

### Entrega 3 — Toolbar reorganizada (M)

Problemas atuais: uma coluna com Formas → Propriedades → Máquina; ações principais (exportar) no rodapé; parâmetros essenciais escondidos; sem atalhos.

Proposta:
- **Barra superior de ações** (horizontal, ícones + rótulo, `public/icons.svg` já existe): Novo, Abrir/Salvar (JSON), Importar SVG, Desfazer/Refazer, Retângulo, Círculo, Polígono/Linha (novo), Duplicar, Excluir, Zoom (−/ajustar/+), Exportar G-code (primário, à direita).
- **Painel lateral com abas/acordeão**: "Máquina" (preset de mesa, área útil, Z), "Material" (preset, espessura, origem da chapa), "Ferramenta & corte" (Ø, avanço, mergulho, RPM, passe, altura segura), "Peça selecionada" (posição X/Y, largura/altura/raio, rotação, profundidade, operação, lado do offset: dentro/fora/na linha).
- **Rodapé de status**: dimensões da chapa, nº de formas, avisos de validação (ícone âmbar/vermelho clicável), tempo estimado de usinagem (vem da Entrega 4).
- Inputs numéricos com validação (min/step, não aceita vazio → mantém último valor válido), unidade sufixada, `Enter` confirma, setas ± step. Substituir `window.alert` por toast/inline.
- Atalhos: `Del` remove, `Ctrl+D` duplica, `Ctrl+Z/Y`, `R`/`C` adiciona forma, setas movem 1 mm (Shift = 10 mm).
- Undo/redo: `zustand` `temporal` (zundo) ou pilha manual no store (P).
- Testes de componente cobrindo cada aba e os atalhos; e2e atualizado (`data-testid` mantidos).

### Entrega 4 — Simulador com tempo real, step e barra (G)

Núcleo: **um único motor de percurso** compartilhado por G-code e simulador.

- `lib/toolpath.ts`: `buildToolpath(shapes, settings): Segment[]` onde `Segment = { from: [x,y,z], to: [x,y,z], type: "rapid" | "feed" | "plunge", feed: number, shapeId, pass }`. `gcode.ts` passa a serializar segmentos; `Simulator` consome os mesmos segmentos. Isso resolve A2 e garante que o tempo simulado = tempo do G-code.
- `lib/timing.ts`: `estimateTime(segments, {rapidRate, accel?})` → duração por segmento (`length / feed`) e acumulado; `rapidRate` novo em `MachineSettings` (GRBL típico 2000–5000 mm/min). Versão 1 sem aceleração; versão 2 opcional com rampa trapezoidal (`accel` mm/s²) para prever melhor em peças com muitos segmentos curtos (círculos de 64 lados).
- Estado do player (store separado `useSimStore`): `t` (segundos decorridos), `playing`, `speed` (0,25×–8×), `stepMode` ("segment" | "pass" | "shape"). Posição da fresa = interpolação linear dentro do segmento atual para o tempo `t` — assim a animação anda em tempo real (1× = tempo real da máquina) e não por índice a 15 ms.
- Controles: ▶/⏸, ⏮ início, ⏭ fim, ⏪ passo anterior, ⏩ próximo passo (segmento/passe/forma selecionável), seletor de velocidade, **barra de tempo** (`<input type=range>` sobre `t` com marcações de fim de cada forma/passe, arrastável — scrub), leitura "02:14 / 07:52" (decorrido/total), tempo restante, segmento atual (`G1 X.. Y.. F..`), forma atual destacada.
- Visual 3D: mesa (`workArea`) e chapa (`stock`) desenhadas como caixas; percurso já cortado em cor cheia, futuro em cor apagada (duas `Line` com `drawRange` ou atualização de atributos de cor por vértice); rapids tracejados; ferramenta como cilindro com Ø real; câmera `OrbitControls` (three/examples) com botão "ajustar à peça"; ortho top-view opcional.
- Previsão do tempo total também aparece no rodapé da toolbar e como comentário no G-code (`; tempo estimado: 7m52s`).
- Testes: `toolpath.test.ts` (paridade: G-code gerado a partir de segmentos bate com os testes atuais), `timing.test.ts` (segmento de 100 mm a 600 mm/min = 10 s; rapids usam `rapidRate`; soma), `simStore.test.ts` (step avança para o próximo limite; scrub clampa em [0,total]). Playwright: play → tempo avança; step → posição muda; scrub no fim → botão vira "Reiniciar".

### Entrega 5 — Correções da auditoria não cobertas acima (P/M)

- Compensação de ferramenta no contorno (dentro/fora/na linha) via offset de polígono (implementação própria para polígonos convexos + `clipper-lib`/`polygon-offset` para o geral) e pocket com scanlines recortadas pela forma real, com passe de acabamento no contorno interno.
- Ordenação de operações: pockets/gravações antes de recortes; ao final, recortes de dentro para fora. Opcional: "tabs" (pontes) em recortes passantes.
- SVG: respeitar `viewBox`/`width` com unidade, `transform="translate/scale"`, e aproximar curvas (C/Q/A) por segmentos (`svg-path-properties` ou amostragem por `SVGGeometryElement.getPointAtLength` já que roda no navegador). Aviso visível quando algo for descartado.
- Robustez de inputs (B3), `@types/three` → dev, `useMemo` (C1), remover contador de id duplicado (B6).
- Rodar `test:e2e` num CI (GitHub Actions com `npx playwright install --with-deps chromium`) — o README já admite que nunca foram executados.

## 4. Ordem sugerida e dependências

1 (mesa/base) → 2 (material, depende da espessura/stock) → 4 (motor de percurso + simulador; independente de 3, mas o rodapé com tempo é da 3) → 3 (toolbar, se apoia nos dados de 1, 2 e 4) → 5 (qualidade de usinagem; pode ser intercalada, sendo a compensação de ferramenta a mais valiosa).

Se quiser começar por onde tem mais impacto visível para o usuário: 1 + 4 primeiro (mesa e simulador crível), depois 3, depois 2 e 5.

## 5. Decisões que preciso de você antes de implementar

- Presets de mesa: confirmar a lista (3018, 3040, 6040, 6090, 1010, 1325) e se a origem padrão é canto frontal-esquerdo (padrão GRBL) ou centro.
- Alumínio: manter no MVP mesmo sem refrigeração/tabs? Os presets são conservadores mas alumínio em router hobby exige cuidado; posso marcar como "avançado".
- Velocidade de rapid (`G0`) padrão para estimativa de tempo: sugiro 3000 mm/min (ajustável).
- Compensação de ferramenta (Entrega 5) entra já ou fica para depois? Ela muda dimensões das peças exportadas — quem já usa o app hoje vai notar diferença.
- Persistência: só `localStorage` (proposto) ou também exportar/importar arquivo `.json` do projeto (recomendo os dois; é barato).
