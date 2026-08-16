---
name: fechar-sprint
description: Fecha uma sprint do Oficina CNC pela DoD global. Use when the user says fechar sprint, DoD, marcar sprint, concluir sprint, or asks to wrap up a sprint checklist.
---

# Fechar sprint

Seguir a DoD em [`AGENTS.md`](../../../AGENTS.md) e [`docs/sprints/README.md`](../../../docs/sprints/README.md). Não marcar concluída se algum item falhar. Textos novos de UI no tom de oficina (AGENTS.md).

## Checklist

```
- [ ] npm run build
- [ ] npm run lint
- [ ] npm run test:coverage
- [ ] npm run test:e2e (chromium; mobile/tablet se tocou layout)
- [ ] Sample docs/samples/*.gcode se tocou toolpath|gcode
- [ ] Fluxo básico sem regressão (adicionar → ajustar → simular → exportar)
- [ ] README + JSDoc + CHANGELOG.md (## [0.NN.0 — Sprint NN — Tema] — data)
- [ ] package.json version 0.NN.0 + git tag vNN
- [ ] Sem console.log / any / window.alert|confirm|prompt novos
- [ ] Screenshots em docs/sprints/img/ se a UI mudou
- [ ] Checkboxes e Status no sprint-NN-*.md; ✅ na tabela do README das sprints
```

## Passos

1. Identificar o arquivo `docs/sprints/sprint-NN-*.md` da sprint (perguntar se houver dúvida).
2. Rodar build, lint, `test:coverage` e e2e. Corrigir falhas antes de seguir.
3. Se a diff tocar `src/lib/toolpath.ts` ou `src/lib/gcode.ts`: gerar ou atualizar um `.gcode` em `docs/samples/` e conferir cabeçalho, unidades, multi-passe e safe height.
4. Atualizar README se a funcionalidade for visível ao usuário. Tipos novos com JSDoc.
5. Entrada no `CHANGELOG.md` no formato que o diálogo Novidades lê; subir a versão no `package.json`.
6. Marcar tarefas `[x]` no arquivo da sprint e o topo: `Status: concluída — YYYY-MM-DD · Versão: 0.NN.0`.
7. Atualizar a tabela em `docs/sprints/README.md` (✅) e, se houver, `fase-N.md`.
8. Só commitar (e criar a tag) se o usuário pedir.
