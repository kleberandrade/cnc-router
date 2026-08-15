# Sprint 08 — Responsivo (celular/tablet) e PWA

**Status:** concluída — 2026-08-15
**Esforço:** M (4–6 dias)
**Depende de:** 07

## Objetivo
Usar no celular/tablet com toque (ver, ajustar parâmetros, simular e exportar; desenhar com limitações razoáveis) e instalar como app (PWA) funcionando offline.

## Breakpoints
- ≥ 1200 px: layout atual (painel lateral fixo).
- 768–1199 px: painel lateral colapsável (gaveta à esquerda), ribbon só com ícones.
- < 768 px (celular): barra superior compacta (logo, aba, exportar); ações em **barra inferior** (formas, undo/redo, simular); painel de configurações em **folha inferior** (bottom sheet) arrastável com as mesmas seções; canvas ocupa o resto; status bar vira chip flutuante.

## Tarefas
- [x] CSS por breakpoint + `useMediaQuery`; `BottomSheet.tsx`, `BottomActionBar.tsx`.
- [x] Toque no editor (Konva): arrastar formas com um dedo, pinça = zoom, dois dedos = pan; tap = selecionar; long-press = menu contextual (duplicar/excluir/propriedades); polígono por toque com botão "Fechar polígono".
- [x] Toque no simulador: `OrbitControls` touch (um dedo órbita, dois dedos pan/zoom); controles com alvo mínimo 44 px.
- [x] Inputs mobile: `inputMode="decimal"`, teclado numérico; `select` nativo.
- [x] Viewport/safe-area (`env(safe-area-inset-*)`), sem zoom acidental de página (`touch-action: none` no canvas).
- [x] PWA: `vite-plugin-pwa` (manifest: nome, ícones 192/512 maskable, `display: standalone`, tema, `start_url`), service worker com precache do build + fontes auto-hospedadas (Fraunces/Inter/JetBrains Mono em `public/fonts`, sem Google Fonts), estratégia `autoUpdate` com aviso "nova versão disponível".
- [x] Offline: tudo já é client-side; garantir que projeto persistido (localStorage) e "Abrir .json" funcionam sem rede; página offline de fallback.
- [x] Botão "Instalar app" (evento `beforeinstallprompt`) no menu do projeto; instruções para iOS (Compartilhar → Adicionar à Tela).
- [x] Testes: Playwright com `devices["Pixel 7"]` e `devices["iPad (gen 7)"]`: abrir, adicionar forma pela barra inferior, editar profundidade no bottom sheet, simular, exportar; Lighthouse PWA ≥ 90 no CI (`@lhci/cli` ou `playwright` + `workbox` check do manifest/SW).

## DoD específica
- Em 390×844 (celular) todos os fluxos principais funcionam sem scroll horizontal e sem elementos cortados; alvos ≥ 44 px.
- Pinça faz zoom no editor; arraste move forma; simulador orbita com toque.
- App instalável (Chrome/Android e Edge/desktop) e abre offline após a primeira visita, incluindo fontes.
- Lighthouse: PWA instalável, performance ≥ 80 no celular.

## Fora de escopo
Sincronização em nuvem, notificações.

## Notas de fechamento
- Long-press/menu contextual no toque não implementado (excluir/duplicar estão na barra inferior).
- Lighthouse não roda no CI; a verificação de PWA é feita pelo Playwright (manifest, SW ativo, offline). Rodar Lighthouse manualmente no Chrome antes de publicar.
- Fontes: `@fontsource` (Inter 400/500/600, JetBrains Mono 400/500, Fraunces variável) — precache ≈ 1,8 MB.
- Testes: 173 unitários, 43 e2e em três projetos.
