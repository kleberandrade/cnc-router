# Sprint 07 — Interface unificada (ribbon), espaçamento, ícones

**Status:** concluída — 2026-08-15
**Esforço:** M (4–6 dias)
**Depende de:** —

## Objetivo
Uma única barra superior estilo Fusion (logo + menu do projeto + abas de contexto + ações + exportar), sistema de espaçamento consistente, zero emojis e campos numéricos que nunca cortam valor. (Unidades: decidido **somente mm** — item removido.)

## Desenho da barra
```
[⌂ Oficina CNC ▾] │ DESENHAR · SIMULAR │ [Novo][Abrir][Salvar] │ [Retângulo][Círculo][Polígono] │ [Duplicar][Excluir] │ [Desfazer][Refazer] │ [Zoom −][100%][Zoom +] │ … │ [Exportar G-code]
```
- A aba ativa troca os grupos centrais: em **Simular** aparecem play/pause, passo, velocidade, vistas (Topo/Iso/Ajustar) no lugar das ferramentas de desenho.
- Grupos com legenda pequena embaixo (como o Fusion: "CRIAR", "MODIFICAR", "VISTA") — some abaixo de 1200 px.
- Menu do projeto (▾ ao lado do logo): Novo, Abrir, Salvar, Exportar, Configurações (unidades, tema), Atalhos, Sobre.
- Altura total ≤ 64 px (hoje ~110 px).

## Tarefas
- [x] Tokens de design em `index.css`: escala de espaçamento `--s1..--s6` (4/8/12/16/24/32), raios, tamanhos de fonte, alturas de controle (28/32/36); documentar em `docs/design-tokens.md`.
- [x] `TopBar.tsx` substitui `app-header` + `ActionBar`; grupos por contexto (`ribbon groups`), tooltips com atalho, overflow com menu "…" quando não couber.
- [x] Ícones: adotar `lucide-react` (ou ampliar o sprite) e substituir **todos** os emojis/unicode: controles do simulador, ☰, ▸/▾ do acordeão, ⌗ do logo, × do aviso, ✓/⚠ dos status.
- [x] `NumberField`: largura mínima de texto 72 px; sufixo de unidade encolhe para 28 px e oculta abaixo de 220 px de painel; `field-row` vira grid `repeat(auto-fit, minmax(96px, 1fr))` (3 campos → 2+1 quando aperta); testes de layout com Playwright em 1280/1024/800 px de largura confirmando `scrollWidth ≤ clientWidth` dos inputs.
- [x] Padding/margens: `panel-body` 12–16 px, gap vertical 12 px entre campos, checkbox com margem, `Notice` com margem inferior; auditoria visual das capturas em `docs/design-tokens.md` (antes/depois).
- [x] Menu do projeto com Atalhos e Sobre; tokens de tema (claro) prontos para o escuro (Sprint 11).
- [x] Testes: TopBar (troca de contexto), NumberField (largura/sufixo), e2e de layout.

## DoD específica
- Nenhum caractere emoji/unicode decorativo em `src/` (grep por classes de emoji e ⏮⏪⏩⏭☰▸▾⌗×✓⚠ vazio).
- Em 1280 px, os campos X/Y/Z da Máquina mostram "600", "400", "80" completos com sufixo; em 800 px continuam legíveis (quebra em 2+1).
- Barra superior única com ≤ 64 px de altura; alternar Desenhar/Simular troca os grupos sem re-montar o canvas/cena.
- Espaçamento interno mínimo de 12 px em todos os containers (verificado por teste que lê `getComputedStyle`).

## Fora de escopo
Tema escuro ligado (Sprint 11), layout de celular (Sprint 08).

## Notas de fechamento
- Unidades removidas do escopo (decisão: somente mm).
- Abaixo de 1440 px a ribbon fica só com ícones e o grupo Projeto some (disponível no menu do logo) — em 1280 px tudo cabe numa linha sem overflow.
- Vista "Isométrica" reutiliza o enquadramento padrão (a câmera com ViewCube vem na Sprint 10).
- Testes: 173 unitários (89 % linhas / 80 % branches), 36 e2e.
