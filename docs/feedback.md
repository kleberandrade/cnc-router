# Sugestões e problemas — como funciona e como ler

## Fluxo
1. Usuário abre **menu Oficina CNC → Sugestões e problemas…** (ou o link no Sobre), escolhe o tipo (sugestão / problema / outro), escreve título e mensagem, e-mail opcional, e decide se anexa **diagnóstico** (versão, sha, navegador, idioma, viewport, tema, PWA instalado, resumo anônimo do projeto: nº de peças por tipo, máquina, chapa, material, pós, unidades, nº de fresas, últimos 5 erros capturados por `window.onerror`) e/ou o **projeto** (`{ shapes, settings }`, máx. 512 kB).
2. O app faz `POST /api/feedback` (Vercel Serverless Function, `api/feedback.ts`). Sem `BLOB_READ_WRITE_TOKEN` a função devolve **501** e o app oferece o `mailto:` pré-preenchido; offline o envio nem tenta.
3. A função valida (tipo, título 3–140, mensagem 10–5000, e-mail opcional válido, corpo ≤ 1 MB, honeypot `website` vazio, origem permitida), aplica **rate limit** de 5/min por IP (memória da instância, `Retry-After: 60`) e grava um JSON **privado** no **Vercel Blob**: `feedback/AAAA-MM/<ISO>-<tipo>-<id>.json`. Resposta: `{ ok, id, receivedAt }` — o id curto aparece para o usuário como referência.

## Ativar na Vercel (uma vez)
1. Projeto → **Storage → Create Database → Blob** → conectar ao projeto (produção + preview). Isso cria `BLOB_READ_WRITE_TOKEN` automaticamente.
2. Redeploy. Teste: enviar uma sugestão pelo app e conferir em **Storage → Blob → Browser** a pasta `feedback/`.
3. Domínios permitidos (CORS) estão em `api/feedback.ts` (`ORIGINS` + `VERCEL_URL`/`VERCEL_PROJECT_PRODUCTION_URL`). Requisições same-origin (sem header `Origin`) sempre passam.

Custo: o plano Hobby inclui armazenamento e operações de sobra para este uso (cada envio tem poucos kB).

## Ler os envios
- **Dashboard**: Storage → Blob → navegar `feedback/AAAA-MM/` e abrir o JSON.
- **CLI/script**: `vercel env pull .env.local` (traz o token) e `BLOB_READ_WRITE_TOKEN=... npx tsx scripts/feedback-report.ts 2026-08` — imprime data, tipo, versão, id, título e e-mail; `--json` para exportar.
- Responder: quando houver e-mail no envio, responder manualmente (não há envio automático de e-mail — Resend/Postmark ficam para depois se o volume justificar).

## Privacidade (LGPD)
- Nada é obrigatório além de título e mensagem. E-mail só se a pessoa quiser resposta.
- Diagnóstico não contém geometria nem nomes de arquivo; o projeto só vai se a pessoa marcar.
- Guardamos IP e user agent para conter abuso. Retenção sugerida: apagar envios com mais de 12 meses (`vercel blob del` ou pelo dashboard). Pedidos de remoção: pelo e-mail do autor.
- Blobs são **privados** (`access: "private"`): só quem tem o token lê.

## Desenvolvimento local
- `vercel dev` roda a função com o `.env.local`; sem token, `POST /api/feedback` → 501 e o app cai no e-mail. `vite`/`vite preview` sozinhos não servem `/api` (404 → mesmo fallback).
- Testes: `api/__tests__/feedback-core.test.ts` (validação, honeypot, rate limit, CORS, falha do storage), `src/lib/__tests__/feedback.test.ts` (payload, envio, mailto), e2e `feedback.spec.ts` (rota mockada: sucesso, 501, offline).
