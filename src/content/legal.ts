import { PRODUCT, AUTHOR } from "./about";

export interface LegalDoc { id: "privacidade" | "cookies" | "termos"; title: string; updated: string; sections: { h: string; p: string[] }[] }

const updated = "2026-08-16";

export const LEGAL: LegalDoc[] = [
  {
    id: "privacidade",
    title: "Política de privacidade",
    updated,
    sections: [
      { h: "Resumo", p: [
        `O ${PRODUCT.name} roda inteiro no seu navegador. Seu desenho, suas configurações e suas preferências ficam no seu aparelho (armazenamento local do navegador). Não existe conta, não existe servidor guardando o seu projeto.`,
      ] },
      { h: "O que fica no seu navegador", p: [
        "Projeto atual (peças e configurações da máquina), preferências (tema, densidade, tamanho do texto, mouse do 3D), a versão que você já viu (para mostrar as novidades) e se você já fez o tour. Tudo isso é apagado se você limpar os dados do site ou usar Novo projeto.",
      ] },
      { h: "O que é enviado — só quando você manda", p: [
        "Sugestões e problemas: quando você usa o formulário, o texto, o tipo, o e-mail (se você preencher) e — só se você marcar — o diagnóstico (versão, navegador, tamanho da tela, resumo do projeto, últimos erros) e o projeto vão para um armazenamento privado do autor (Vercel Blob). Guardamos também o IP e o navegador para conter abuso. Usamos isso apenas para entender e responder o que você mandou.",
        "Link do projeto: ao copiar um link, o projeto vai dentro do próprio link — quem receber o link vê o projeto. Não passa por servidor.",
      ] },
      { h: "Métricas anônimas", p: [
        "O site usa Vercel Web Analytics e Speed Insights para saber quantas visitas e como está a velocidade. São métricas agregadas, sem cookies de rastreio e sem identificar você. Detalhes na política da Vercel (vercel.com/legal/privacy-policy).",
      ] },
      { h: "Seus direitos (LGPD)", p: [
        `Você pode pedir para ver, corrigir ou apagar qualquer envio seu escrevendo para ${AUTHOR.email}. Envios de sugestões e problemas são mantidos por até 12 meses e depois apagados.`,
      ] },
      { h: "Contato", p: [`${AUTHOR.name} — ${AUTHOR.email}`] },
    ],
  },
  {
    id: "cookies",
    title: "Política de cookies",
    updated,
    sections: [
      { h: "Sem cookies de rastreio", p: [
        `O ${PRODUCT.name} não usa cookies próprios. Não há login, não há publicidade, não há rastreamento entre sites.`,
      ] },
      { h: "Armazenamento local", p: [
        "Usamos o armazenamento local do navegador (localStorage e cache do aplicativo) para guardar o seu projeto, as preferências e os arquivos do app para funcionar offline (PWA). Isso não sai do seu aparelho. Para apagar: limpe os dados do site nas configurações do navegador.",
      ] },
      { h: "Serviços de terceiros", p: [
        "As métricas da Vercel (Analytics/Speed Insights) funcionam sem cookies. Se isso mudar, esta página será atualizada.",
      ] },
    ],
  },
  {
    id: "termos",
    title: "Termos de uso",
    updated,
    sections: [
      { h: "O que é", p: [
        `${PRODUCT.name} é uma ferramenta gratuita para desenhar peças, gerar G-code e simular a usinagem em routers CNC de hobby e pequenas oficinas, feita por ${AUTHOR.name}.`,
      ] },
      { h: "Use por sua conta e risco", p: [
        "O G-code gerado é um ponto de partida. Confira sempre no simulador e na máquina (com a fresa levantada) antes de cortar de verdade. Fresa, chapa, avanços e fixação são responsabilidade sua. O app é fornecido \"como está\", sem garantia de resultado, e o autor não se responsabiliza por danos à máquina, ao material ou a pessoas.",
      ] },
      { h: "Seus projetos são seus", p: [
        "Tudo que você desenha é seu. O autor não vê nem guarda seus projetos, a não ser que você os envie pelo formulário de sugestões.",
      ] },
      { h: "Uso do app", p: [
        "Você pode usar o app livremente para fins pessoais, educacionais e comerciais na sua oficina. Não pode revender o app, remover a identificação do autor nem usá-lo para atividades ilegais.",
      ] },
      { h: "Mudanças", p: [
        "O app evolui por sprints e estes termos podem mudar; a data no topo indica a última versão. Lei aplicável: Brasil.",
      ] },
    ],
  },
];

export const findLegal = (id: string) => LEGAL.find((d) => d.id === id);
