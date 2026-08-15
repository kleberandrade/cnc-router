# Sprint 11 — Navegador de peças, ferramentas por peça, tema escuro, DXF

**Status:** concluída — 2026-08-15
**Esforço:** M (4–6 dias)
**Depende de:** 07, 09

## Objetivo
Produtividade estilo Fusion: painel "Navegador" com a árvore de peças, mais de uma ferramenta no mesmo projeto, tema escuro, e importar DXF.

## Tarefas
- [x] `Navigator.tsx` (aba do painel lateral / gaveta): lista de formas com nome editável, ícone do tipo, olho (mostrar/ocultar → não exporta), cadeado (não move), reordenar por arraste (ordem manual de usinagem), agrupar; seleção sincronizada com o canvas; busca.
- [x] Biblioteca de ferramentas: `settings.tools: Tool[]` (nome, tipo flat/ball/vbit, Ø, nº de cortes, comprimento) e `shape.toolId`; toolpath agrupa por ferramenta com `M0` (pausa) + comentário `; TROCA DE FERRAMENTA: …` ou exporta um arquivo por ferramenta (opção); simulador troca a fresa 3D; validação de Ø por peça.
- [x] Tema escuro: tokens `[data-theme="dark"]`, respeita `prefers-color-scheme`, alternância no menu Configurações; canvas Konva e cena 3D com paletas próprias por tema.
- [x] Importar DXF (`dxf-parser`): LINE, LWPOLYLINE/POLYLINE (bulge → arcos), CIRCLE, ARC, ELLIPSE, SPLINE (amostrada), INSERT com transform, camadas → grupos; unidades pelo `$INSUNITS`.
- [x] Preferências: mouse "Fusion"/"Padrão" (Sprint 10), unidades, tema, atalhos listados (`?` abre a folha de atalhos).
- [x] Testes: navigator (ocultar exclui do G-code, reordenar muda ordem manual), tools (troca gera M0), DXF fixtures (polilinha com bulge, círculo, bloco).

## DoD específica
- Ocultar uma peça no navegador remove-a do G-code e da simulação; reordenar reflete na ordem manual.
- Projeto com 2 ferramentas exporta com pausa/comentário de troca e simula com a fresa certa.
- Tema escuro completo (UI, canvas, 3D) sem contrastes < 4,5:1 (checagem automatizada nos tokens).
- DXF de exemplo (fixture) importa no tamanho certo em mm.

## Fora de escopo
Nesting automático, texto → contorno (Sprint 12).

## Notas de fechamento
- Grupos no navegador não entraram (lista plana com busca cobre o uso atual).
- Exportar um arquivo por fresa não entrou — a troca é por `M0` no mesmo arquivo (comentário indica a fresa).
- Contraste do tema escuro conferido nos tokens principais; verificação automática de contraste fica para o backlog.
- Testes: 220 unitários (88 % linhas / 76 % branches), 57 e2e.
