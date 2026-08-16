# Sprint 19 — Produto: versão, Sobre, novidades

**Status:** planejada
**Esforço:** P (2 dias)
**Depende de:** —

## Objetivo
Saber sempre qual versão está rodando (usuário e autor), apresentar o produto e o autor, e avisar quando há versão nova.

## Modelo
- `package.json` `version` = `0.15.0` agora; regra: cada sprint fechada sobe o **minor** (Sprint 19 → `0.19.0`), correções → patch. `CHANGELOG.md` ganha o número ao lado do nome da sprint.
- `vite.config.ts`: `define: { __APP_VERSION__, __BUILD_DATE__, __GIT_SHA__ }` (`VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? git rev-parse --short HEAD ?? "dev"`); `src/lib/version.ts` exporta `APP_VERSION`, `BUILD_INFO`, `versionLabel()`.
- `src/content/about.ts`: nome, tagline, autor **Kleber Andrade** (`pdjkleber@gmail.com`), links (site em produção, repositório se público, e-mail), licença do app, licenças de terceiros (Inter OFL, Three.js MIT, Konva MIT, clipper-lib BSL, opentype.js MIT, dxf-parser MIT, lucide ISC).
- `src/content/changelog.ts`: gerado a partir do `CHANGELOG.md` no build (plugin Vite pequeno) → "Novidades" no app.

## Tarefas
- [ ] Versão em: menu do projeto (`v0.19.0`), Sobre (versão + build + sha), rodapé do editor (discreto), cabeçalho do G-code (`; Oficina CNC v0.19.0 (abc1234) — Kleber Andrade`), `manifest` (`version`), `document.title` opcional.
- [ ] Sobre reescrito: o que é, para quem, autor + contato, "como ajudar" (link para Feedback da Sprint 20), licenças, atalhos.
- [ ] Novidades: diálogo com as últimas 3 sprints do changelog; badge "novo" no menu quando a versão muda desde a última visita (`localStorage oficina-cnc:seen-version`).
- [ ] PWA: quando o service worker encontra versão nova → toast "Nova versão vX — Atualizar" (hoje só há `updateSW`); registrar no `PwaBanner`.
- [ ] README: seção "Sobre o projeto/autor", badge de versão, política de versionamento.
- [ ] Testes: `version.ts` (label), Sobre renderiza autor/versão, cabeçalho do G-code contém versão, badge "novo" aparece uma vez; e2e Sobre/Novidades.

## DoD específica
- `git tag v0.19.0` no fechamento; a versão aparece nos 4 lugares (menu, Sobre, rodapé, G-code) e bate com o `package.json`.
- Sobre mostra autor, contato e licenças; Novidades lista as 3 últimas sprints.
