---
name: fechar-sprint
description: Fecha uma sprint do Oficina CNC pela DoD global. Use when the user says fechar sprint, DoD, marcar sprint, concluir sprint, or asks to wrap up a sprint checklist.
---

# Fechar sprint

Seguir a DoD em [`AGENTS.md`](../../../AGENTS.md) e [`docs/sprints/README.md`](../../../docs/sprints/README.md). Não marcar concluída se algum item falhar.

## Checklist

```
- [ ] npm run build
- [ ] npm run lint
- [ ] npm run test:coverage
- [ ] npm run test:e2e
- [ ] Sample docs/samples/*.gcode se tocou toolpath|gcode
- [ ] Fluxo básico sem regressão (adicionar → ajustar → simular → exportar)
- [ ] README + JSDoc + CHANGELOG.md
- [ ] Sem console.log / any / window.alert novos
- [ ] Checkboxes e Status no sprint-NN-*.md
```

## Passos

1. Identificar o arquivo `docs/sprints/sprint-NN-*.md` da sprint (perguntar se houver dúvida).
2. Rodar build, lint, `test:coverage` e e2e. Corrigir falhas antes de seguir.
3. Se a diff tocar `src/lib/toolpath.ts` ou `src/lib/gcode.ts`: gerar ou atualizar um `.gcode` em `docs/samples/` e conferir cabeçalho, unidades, multi-passe e safe height.
4. Atualizar README se a funcionalidade for visível ao usuário. Tipos novos com JSDoc.
5. Entrada no `CHANGELOG.md` (why da sprint, data).
6. Marcar tarefas `[x]` no arquivo da sprint e o topo: `Status: concluída — YYYY-MM-DD`.
7. Atualizar a tabela em `docs/sprints/README.md` se o status da sprint ainda não estiver ✅.
8. Só commitar se o usuário pedir.
