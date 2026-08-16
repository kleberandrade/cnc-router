# Sprint 23 — Acabamento de UX: diálogos próprios, origem visual, materiais no 3D, histórico, textos, políticas

**Status:** planejada
**Esforço:** G (6–8 dias)
**Depende de:** 22

## Origem (feedback do autor, 2026-08-16)
1. Diálogos nativos do navegador (`window.confirm` em "Novo projeto"/"Abrir exemplo", `prompt` no fallback do link) fogem do visual — **nunca usar o padrão**.
2. Padding grande no painel; abas do painel "parecendo arquivos"; falta espaço no *Buscar peça* e nos itens do navegador (parcialmente ajustado na Sprint 22 — conferir com o autor e fechar).
3. **Origem (X0 Y0)** como select é pouco visual → escolher no desenho da chapa (cantos + centro).
4. Cor da peça no **simulador de acordo com o material** (MDF, compensado, pinus, alumínio…).
5. **Histórico do projeto** estilo linha do tempo do Fusion, para rever/replicar passos de construção.
6. **Humanizar os textos** (continuação do tom da oficina) — avisos, hints, tooltips, diálogos, README/Sobre.
7. **Atualizar as regras dos agentes** (`AGENTS.md`, `.cursor/rules/*`, `.claude/skills/*`, `CLAUDE.md`) com o que mudou nas Sprints 18–23: tokens de tipografia, ribbon (`RibbonGroupDef`/`OverflowRibbon`), abas do painel, diálogos próprios, tom de copy, versionamento por sprint, feedback/Blob, sem `window.confirm`.
8. **Políticas**: cookies, privacidade e termos de uso — sim, adicionar (o app guarda dados só no navegador; o feedback vai para o autor; Vercel Analytics/Speed Insights coletam métricas anônimas).

## Proposta
### A. Diálogos próprios (`components/Dialog.tsx` + `useConfirm`)
- `Dialog` base (backdrop, foco preso, Esc, `role=dialog`, título, corpo, ações; tamanhos sm/md/lg; variantes `danger`) — substitui os 5 diálogos ad hoc do `TopBar` (Sobre, Atalhos, Preferências, Novidades, Feedback, Organizar, Verificação) por um só componente.
- `useConfirm()` → `confirm({ title, message, confirmLabel, danger })` retornando `Promise<boolean>`; `usePrompt()` para texto. Trocar `window.confirm` (Novo projeto, Abrir exemplo, futuros) e `window.prompt` (link). Regra no `AGENTS.md`: proibido `alert/confirm/prompt`.
- Teste: nenhum `window.confirm|prompt|alert` no `src/` (grep no CI via `oxlint` no-restricted-globals ou teste unitário que lê os arquivos).

### B. Painel: espaçamentos e abas
- Revisar `--s*` no painel: `panel-body` 12/12, grupos 8, campos 6; navegador: input de busca com ícone dentro (`padding-left 28px`), item 32 px, botões 24 px, nome com `min-width 0`; abas do painel como **segmented tabs** (fundo `--surface-2`, ativa `--surface`, sem borda inferior tipo "pasta").
- Screenshot antes/depois em 1440 e 1280; checagem de "nada cortado" (layout.spec já cobre).

### C. Seletor visual de origem (`components/OriginPicker.tsx`)
- Miniatura da chapa (proporcional) com 5 pontos clicáveis: 4 cantos + centro (hoje o modelo suporta `front-left` e `center`; adicionar `front-right`, `back-left`, `back-right` em `StockOrigin` + `workOriginOffset` + testes de G-code); o ponto ativo em `--accent`, tooltip com o nome; teclado (setas). Substitui o `<select>` em Máquina; o `select` continua no DOM oculto? Não — teste id `stock-origin` passa para o picker (`data-value`).

### D. Materiais no simulador
- `lib/materials.ts` ganha `color` (topo) e `colorCut` (miolo) por material: MDF `#c9a97a`/`#b8946a`, compensado `#d9b98a` com veio sutil (listras no shader ou textura procedural 2 tons), pinus `#e8cfa2`/`#d7b985`, alumínio `#b8bec4`/`#9aa1a7` (metálico: `metalness 0.6`), personalizado = cor atual. Heightmap: cor do topo × cor de corte × profundidade (já existe gradiente por profundidade — trocar a paleta pela do material). Legenda no simulador mostra o material.
- Teste unitário: cada material tem cores válidas; e2e: trocar material muda a cor média do canvas (amostra de pixels).

### E. Histórico do projeto (linha do tempo)
- O `zundo` já guarda estados; expor uma **linha do tempo** (`components/Timeline.tsx`, rodapé do editor, como no Fusion): um marcador por ação com ícone (criar, mover, redimensionar, parâmetro, booleana, nesting, importar…), hover mostra o resumo, clique volta àquele estado (undo/redo em lote), "reproduzir" passo a passo com atraso. Precisa de **rótulos de ação**: `store` passa a registrar `lastAction: { kind, label }` a cada mutação (wrapper `act(label, fn)`), e o `temporal` guarda junto (`partialize` inclui `lastAction`). Limite de 200 estados; persistir só o estado atual (histórico é de sessão).
- Fora de escopo: histórico paramétrico editável (mudar um passo antigo e refazer o resto) — anotar na Fase 5.

### F. Textos humanizados
- Passar por todos os `setNotice`, `hint`, `description` dos tooltips, diálogos, README/Sobre com a regra de copy do `AGENTS.md` (curto, direto, "você", verbo no início, sem jargão sem explicar). Lista de strings em `docs/ux/copy-revisado.md` (antes → depois).

### G. Regras dos agentes
- `AGENTS.md`: seções "Arquitetura da UI (Sprint 22)", "Componentes de diálogo", "Tokens", "Testes obrigatórios (unit + e2e + axe)", "Versionamento e changelog", "Copy", "Feedback/Blob", "O que nunca fazer" (diálogos nativos, `title` duplicado com tooltip, texto cortado sem `title`, ids de teste removidos sem atualizar e2e).
- `.cursor/rules/ui.mdc` e `.claude/skills/fechar-sprint/SKILL.md` alinhados (checklist de fechamento: docs, changelog, versão, tag, screenshots, sync).

### H. Políticas (cookies, privacidade, termos)
- `src/content/legal.ts` (pt-BR) + páginas/diálogos **Privacidade**, **Cookies**, **Termos de uso** (menu → Sobre → links; rodapé do Sobre; `/privacidade`, `/termos`, `/cookies` como rotas estáticas geradas no build para SEO/robots).
- Conteúdo: o que é guardado no navegador (localStorage: projeto, preferências, versão vista, tour), o que é enviado (feedback → Vercel Blob privado, com o que você marcar; Vercel Analytics/Speed Insights: métricas anônimas — link para as políticas da Vercel), sem contas, sem cookies de rastreio próprios (o Analytics da Vercel não usa cookies), como apagar seus dados (limpar site/`Novo projeto`), contato do autor, licença "como está" (sem garantia; confira o G-code antes de rodar na máquina — segurança), lei aplicável (Brasil, LGPD).
- **Banner de cookies**: como não há cookies próprios, um aviso discreto na primeira visita ("Sem cookies de rastreio; usamos armazenamento local para o seu projeto") com link para a política — em vez de banner de consentimento.

## Tarefas
- [ ] A — `Dialog`/`useConfirm`/`usePrompt`; migrar todos; teste "sem diálogos nativos".
- [ ] B — espaçamentos do painel + abas segmentadas; screenshots.
- [ ] C — `OriginPicker` + 3 novas origens (modelo, G-code, testes).
- [ ] D — cores por material no simulador (+ legenda).
- [ ] E — linha do tempo com rótulos de ação; voltar/reproduzir.
- [ ] F — copy revisado (lista antes/depois).
- [ ] G — `AGENTS.md`/rules/skills atualizados.
- [ ] H — políticas + aviso de armazenamento local + rotas estáticas + `sitemap`.
- [ ] Testes unit/e2e/axe para cada item; CHANGELOG; versão 0.24.0; tag.

## DoD específica
- Zero `window.confirm/prompt/alert` no código; todos os diálogos usam `Dialog` (foco preso, Esc, axe ok).
- Origem trocada com 1 clique no desenho; G-code muda a origem para as 5 opções (testes).
- Trocar material muda a cor da peça no 3D.
- Linha do tempo com ≥ 8 tipos de ação, clique volta ao estado, sem quebrar undo/redo existente.
- Políticas acessíveis do Sobre e por URL; `AGENTS.md` cobre as regras acima.
