# Sprint 17 — Enviar para a máquina (Web Serial / GRBL)

**Status:** backlog — Fase 5 (ver `fase-5.md`)
**Esforço:** G (7–10 dias)
**Depende de:** 14

## Tarefas
- [ ] `lib/grbl.ts`: conexão Web Serial (115200), parser de status `<Idle|MPos:…|WPos:…>`, `$$` settings, alarmes/erros com mensagens em pt-BR.
- [ ] Painel **Máquina** (aba nova na ribbon "Usinar"): conectar/desconectar, DRO (MPos/WPos), jog (X/Y/Z, passo, avanço), zerar eixos (G10 L20), homing ($H), unlock ($X), spindle on/off, sondar Z (G38.2) opcional.
- [ ] Streaming do G-code com controle de buffer (character-counting), pausa/retomar (!/~), parada (Ctrl-X), barra de progresso ligada ao simulador (posição real da máquina no 3D).
- [ ] Segurança: confirmações antes de rodar, botão de parada sempre visível, avisos se coordenadas saem da mesa, checklist pré-corte.
- [ ] Fallback quando Web Serial não existe (Firefox/iOS): instruções + download do arquivo.
- [ ] Testes: parser/streamer com porta serial simulada; e2e com mock de `navigator.serial`.

## DoD específica
- Conecta a um GRBL real (ou simulador GRBL), joga, zera, roda o `.gcode` exportado com pausa/retomar e mostra a posição real no simulador 3D.
