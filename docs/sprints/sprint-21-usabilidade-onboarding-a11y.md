# Sprint 21 — Usabilidade: primeiro uso, mensagens, acessibilidade, mobile

**Status:** planejada
**Esforço:** M (4–5 dias)
**Depende de:** 18

## Objetivo
Alguém que nunca viu o app consegue, em 5 minutos, desenhar uma peça, entender o que vai acontecer e exportar — no desktop e no celular — e usuários de teclado/leitor de tela não ficam presos.

## Tarefas
- [ ] **Estado vazio** do editor: card "Comece por aqui" (3 passos: chapa → forma → exportar) com botões, e **exemplos** (3 projetos prontos: placa com furos, caixa com tabs, letreiro) no menu e no card; some ao criar a 1.ª forma.
- [ ] **Tour curto opcional** (5 balões: ribbon, painel, chapa, exportar, simular) na primeira visita; "não mostrar de novo".
- [ ] **Mensagens** (`design:ux-copy`): revisar avisos/erros de validação e notices (o que aconteceu, o que fazer, botão de ação — ex.: "Chapa menor que a peça → Ajustar chapa"), tooltips em todos os botões com atalho, textos de confirmação (Novo projeto).
- [ ] **Acessibilidade** (`design:accessibility-review`, WCAG 2.1 AA): ordem de foco, `focus-visible` em tudo, `aria-label` nos ícones, `role=tablist` nas abas, diálogos com foco preso e Esc, contraste em claro/escuro (checar `--text-muted`), tamanho de toque ≥ 40 px no mobile, `prefers-reduced-motion`.
- [ ] **Mobile**: painel em folha com alças maiores, ribbon com "Mais" (Sprint 18) e gestos (pinça, 2 dedos pan) revisados, campos numéricos com teclado decimal, botão Exportar sempre visível.
- [ ] **Preferências**: densidade (compacta/confortável), tamanho de fonte (pequena/normal), reset de dicas.
- [ ] Testes: e2e do estado vazio/exemplos/tour, axe-core (`@axe-core/playwright`) sem violações sérias nas 3 vistas, mobile Pixel 7 (fluxo completo).

## DoD específica
- Novo usuário (teste com 2 pessoas, roteiro em `docs/ux/roteiro-teste.md`) conclui "desenhar retângulo com furo e exportar" sem ajuda em ≤ 5 min.
- axe: 0 violações críticas/sérias; navegação só por teclado cobre ribbon, painel, diálogos.
- Exemplos abrem em 1 clique e simulam.
