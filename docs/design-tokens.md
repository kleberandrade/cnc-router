# Design tokens e regras de layout

Definidos em `src/index.css` (`:root`). O tema escuro (Sprint 11) troca apenas os tokens semânticos.

| Token | Valor | Uso |
|---|---|---|
| `--s1..--s6` | 4 / 8 / 12 / 16 / 24 / 32 px | Escala de espaçamento. Padding interno de containers ≥ `--s3` (12 px); gap entre campos `--s3`; painel `--s3`/`--s4`. |
| `--control-h` / `--control-h-sm` | 32 / 28 px | Altura de inputs, selects e botões de ícone. |
| `--topbar-h` | 64 px | Barra superior única (logo + abas + ribbon + exportar). |
| `--radius` / `--radius-sm` | 10 / 6 px | Cartões e controles. |
| `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--border-strong`, `--danger`, `--success`, `--accent`, `--blueprint`, `--warn` | ver `index.css` | Semânticos — únicos que o tema escuro precisa sobrescrever. |
| `--font-display` / `--font-body` / `--font-mono` | Fraunces / Inter / JetBrains Mono | Títulos, texto, números/código. |

## Regras

- **Ícones**: `lucide-react`, 18 px na ribbon, 16 px em menus/avisos, 13–14 px em texto de status. Nenhum emoji ou glifo unicode decorativo na UI.
- **Ribbon**: grupos com título (Projeto, Criar, Modificar, Vista / Reproduzir, Ajustes, Vista); abaixo de 1440 px mostra só ícones (tooltip com nome e atalho) e o grupo Projeto some (está no menu do logo); abaixo de 1100 px o nome do app some.
- **Campos numéricos** (`NumberField`): área de texto mínima 72 px, sufixo de unidade ≤ 64 px com reticências; `.field-row` é grid `auto-fit minmax(104px)` — 3 campos viram 2 + 1 quando o painel aperta. Teste e2e verifica `scrollWidth ≤ clientWidth` em 1280/1024/800 px.
- **Painel em acordeão**: título em caixa alta 11 px sem quebra; resumo em mono com reticências; corpo com padding 12/16 px e gap 12 px.
- **Avisos**: `Notice` com ícone (info/aviso/erro), sem `alert()`.

## Antes / depois (Sprint 07)

- Antes: duas faixas no topo (~110 px), campos X/Y/Z cortando ("6(", "4(", "8("), checkbox encostado na borda, emojis nos controles.
- Depois: uma barra de 64 px com abas de contexto, campos completos em 1280/1024/800 px, padding ≥ 12 px em todos os containers, ícones Lucide.
