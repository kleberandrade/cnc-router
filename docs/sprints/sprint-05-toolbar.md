# Sprint 05 — Toolbar reorganizada

**Status:** planejada
**Esforço:** M (3–5 dias)
**Depende de:** 01, 02, 03

## Objetivo
Separar ações (barra superior) de configuração (painel lateral por seções), com edição numérica da peça selecionada, atalhos, undo/redo e rodapé de status com avisos e tempo estimado.

## Estrutura
- **ActionBar** (topo, ícones de `public/icons.svg` + rótulo): Novo · Abrir/Salvar (.json) · Importar SVG · Desfazer/Refazer · Retângulo · Círculo · Polígono (novo, cliques no canvas) · Duplicar · Excluir · Zoom −/ajustar/+ · **Exportar G-code** (primário, à direita).
- **SidePanel** (acordeão, uma aberta por vez, lembra a última): Máquina · Chapa/base · Material & ferramenta · Peça selecionada (X, Y, L, A/raio, rotação, profundidade, operação, "cortar através").
- **StatusBar** (rodapé): mesa/chapa, nº de formas, avisos de validação (clicável → destaca forma), tempo estimado.

## Tarefas
- [ ] Componentes `ActionBar.tsx`, `SidePanel.tsx` (+ `sections/*.tsx`), `StatusBar.tsx`, `NumberField.tsx` (unidade sufixada, min/step, setas ±, Enter confirma, sem aceitar vazio).
- [ ] Undo/redo: `zundo` (`temporal`) no `useProjectStore` limitado a 100 estados, ignorando `selectedId`.
- [ ] Salvar/abrir projeto `.json` (schema versionado, mesmo `migrate` da persistência).
- [ ] Polígono: ferramenta de desenho por cliques (fecha com duplo-clique/Enter) gerando `PathShape`.
- [ ] Zoom/pan no editor (roda + arrastar com espaço), "ajustar" enquadra a mesa.
- [ ] Atalhos: Del, Ctrl+D, Ctrl+Z/Y, R, C, P, setas 1 mm / Shift 10 mm, Esc desseleciona.
- [ ] Responsivo mínimo: painel colapsável < 1024 px.
- [ ] Testes de componente por seção e por atalho; `Toolbar.test.tsx` migra para os novos componentes mantendo os `data-testid` (`add-rectangle`, `add-circle`, `import-svg`, `export-gcode`).
- [ ] E2E: undo após adicionar; salvar → recarregar → abrir; editar X numérico move a forma.

## DoD específica
- Todos os `data-testid` antigos continuam existindo e os e2e anteriores passam sem edição.
- Ctrl+Z desfaz mover/adicionar/remover/editar propriedade; Ctrl+Y refaz.
- Editar X/Y/L/A no painel reflete no canvas e vice-versa (drag atualiza campos).
- Avisos do rodapé levam à forma com problema; exportação bloqueada por erro mostra o motivo no rodapé.
- Nenhum `window.alert`; navegação por teclado (Tab) cobre toda a toolbar; foco visível.

## Fora de escopo
Tema escuro, i18n.
