# Sprint 20 — Sugestões e problemas (Vercel Function + Blob)

**Status:** planejada
**Esforço:** M (3–4 dias)
**Depende de:** 19

## Objetivo
Qualquer pessoa consegue mandar uma sugestão ou reportar um problema de dentro do app, com diagnóstico anexado, sem criar conta; o autor lê tudo no Vercel.

## Arquitetura
- Front (estático) continua 100 % client-side; ganha um **endpoint** `api/feedback.ts` (Vercel Serverless Function, Node 20) — o app segue funcionando offline; o envio fica desabilitado sem rede com mensagem clara.
- Armazenamento: **Vercel Blob** (`@vercel/blob`, token `BLOB_READ_WRITE_TOKEN` no projeto Vercel). Cada envio → `feedback/AAAA-MM/<ISO>-<id>.json` (`access: "private"`), com: tipo (sugestão | problema | outro), título, mensagem, e-mail opcional, versão/build/sha, user agent, viewport, tema, resumo do projeto (nº de formas, máquina, chapa, material, pós) e, se o usuário marcar, o projeto inteiro (`.json`, limite 512 kB) e o último erro capturado (`window.onerror`/`unhandledrejection` guardados num buffer).
- Proteções: honeypot, tamanho máximo do corpo (1 MB), rate limit por IP (`Map` em memória da função + cabeçalho `x-forwarded-for`, 5/min) e `Retry-After`; CORS só do próprio domínio; sem cookies.
- Leitura pelo autor: `vercel blob ls feedback/` ou dashboard → Storage → Blob; script `scripts/feedback-report.ts` (`vercel blob` API) que baixa e imprime uma tabela; opcional: e-mail (Resend) fica para depois.
- Sem Vercel Blob configurado (dev local): a função devolve 501 e o app mostra "canal indisponível — envie por e-mail" com `mailto:` pré-preenchido.

## Tarefas
- [ ] `api/feedback.ts` + `vercel.json` (functions, maxDuration 10 s) + `.env.example`; testes da função com `vitest` (handler puro, Blob mockado).
- [ ] `src/lib/feedback.ts` (payload, diagnóstico, buffer de erros, `sendFeedback()` com timeout) e `src/components/FeedbackDialog.tsx` (menu do projeto → "Sugestões e problemas", atalho no Sobre e no rodapé; tipo, título, mensagem, e-mail opcional, checkbox "anexar projeto", checkbox "anexar diagnóstico", pré-visualização do que vai).
- [ ] Estados: enviando / enviado (id curto para referência) / erro com fallback `mailto:`; offline desabilita com hint.
- [ ] Docs: `docs/feedback.md` (como ativar o Blob no projeto Vercel, variável, custo do Hobby, como ler/baixar, retenção e LGPD: o que é coletado, e-mail opcional, como pedir remoção).
- [ ] Testes: unit (payload sem dados sensíveis por padrão, limite de tamanho, buffer de erros), e2e com rota mockada (`page.route('/api/feedback')`) para sucesso/erro/offline.

## DoD específica
- Enviar uma sugestão em produção cria um JSON no Blob e o app mostra o id; a função rejeita corpo > 1 MB e 6.º envio no minuto (429).
- Sem token, o app oferece o `mailto:` — nunca falha em silêncio.
- `docs/feedback.md` permite ao autor ler os envios em < 5 min.
