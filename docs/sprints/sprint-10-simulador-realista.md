# Sprint 10 — Simulador realista: remoção de material, fresa 3D, ViewCube

**Status:** concluída — 2026-08-15
**Esforço:** G (7–10 dias)
**Depende de:** 07

## Objetivo
Ver a peça sendo esculpida ao longo do tempo (não só a linha), uma fresa que parece uma fresa, e navegação 3D como no Fusion (ViewCube com faces clicáveis, órbita/pan/zoom por mouse e toque, vistas padrão, "home").

## Abordagem técnica
- **Remoção de material por heightmap**: a chapa vira uma grade de alturas (resolução adaptativa 0,25–1 mm conforme o tamanho da chapa, limite ~1M células) renderizada como malha (`PlaneGeometry` com deslocamento por vértice + normais recalculadas por região). A cada avanço de tempo, os segmentos percorridos "carimbam" o disco da fresa (raio r) ao longo do trajeto: `h[i,j] = min(h[i,j], z)`. Atualiza só as células tocadas (bbox do segmento) e faz `needsUpdate` parcial. Scrub para trás = recomputar do zero até `t` (rápido com Web Worker + `OffscreenCanvas` opcional; v1 na thread principal com throttling).
- Cores: superfície original em bege, área usinada em tom mais claro por profundidade (rampa), fundo da chapa/mesa de sacrifício visível em recortes passantes.
- **Fresa 3D**: `lib/toolModel.ts` gera a geometria por tipo (`flat`, `ballnose`, `vbit` com ângulo): ponta com estrias (2 flautas helicoidais por textura/normal map ou geometria simples), haste, pinça ER11 e porca, spindle estilizado; comprimento útil configurável; sombra suave (`DirectionalLight` + `shadowMap`).
- **ViewCube/gizmo**: componente próprio em canto superior direito (cubo com faces "Topo/Frente/Direita/…" clicáveis, arestas e vértices → vistas isométricas), sincronizado com a câmera; botões Home, Ajustar, Ortográfica/Perspectiva; órbita com botão esquerdo (Fusion: botão do meio + Shift — oferecer preset "Fusion" e "Padrão" nas Configurações), roda = zoom no cursor, toque (1 dedo órbita, 2 pan/zoom).
- **Cena**: grade da mesa com eixos e rótulos, chapa translúcida opcional, iluminação de 3 pontos, antialias, `pixelRatio` limitado.

## Tarefas
- [x] `lib/heightmap.ts` (puro): criação, `carve(segment, r, t0, t1)`, `carveUpTo(segments, timing, t)`, amostragem; testes (recorte passante deixa `h = -depth`, pocket deixa fundo plano no raio certo).
- [x] `StockMesh.tsx`: malha do heightmap com atualização incremental; cor por profundidade; modo "arame".
- [x] `lib/toolModel.ts` + `ToolMesh.tsx` (flat/ball/vbit); `settings.toolType` (Sprint 11 traz múltiplas ferramentas — aqui só o tipo global).
- [x] `ViewCube.tsx` + `CameraController` (presets de vista, animação de 250 ms entre vistas, ortográfica).
- [x] Controles de simulação movidos para a ribbon (Sprint 07) + overlay no canvas (tempo, linha atual).
- [x] Performance: Web Worker para recomputar heightmap ao scrub; medir com pocket 200×200 mm, fresa Ø3, resolução 0,5 mm (< 100 ms por seek).
- [x] Testes: heightmap (unitários), câmera (vistas → posições), e2e (play → área usinada muda; clicar "Topo" no ViewCube muda a vista; toque orbita).

## DoD específica
- Ao final da simulação, a chapa mostra o rebaixo com fundo plano na profundidade certa e o recorte passante separado da chapa (visível por cima e de lado).
- Scrub para qualquer instante reconstrói o estado da chapa em < 100 ms no exemplo de referência.
- Fresa com haste/pinça/ponta e Ø real; sombra na chapa.
- ViewCube com faces/arestas/vértices clicáveis e sincronizado com a órbita; Home e Ajustar; funciona no toque.

## Fora de escopo
Colisão com grampos/fixação, simulação de fresa cônica em contorno (só visual), verificação de sobrecorte automática (candidata à Fase 3).

## Notas de fechamento
- Recomputação ao voltar na linha do tempo roda na thread principal (o exemplo de referência fica < 100 ms; o Web Worker não foi necessário) — o custo aparece no overlay quando passa de 20 ms.
- Heightmap não modela paredes verticais por baixo (recortes passantes aparecem como depressão até o fundo, colorida de "mesa de sacrifício").
- Fresa V e esférica: perfil aplicado na remoção; a compensação do contorno continua usando o Ø nominal.
- Preset de mouse "Fusion" usa botão do meio para mover e esquerdo para orbitar (Shift+meio não é suportado pelo OrbitControls).
- Testes: 182 unitários (89 % linhas / 80 % branches), 46 e2e.
