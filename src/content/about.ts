/** Product and author facts shown in "Sobre", README and the G-code header. Keep in one place. */
export const PRODUCT = {
  name: "Oficina CNC",
  tagline: "Editor 2D, gerador de G-code e simulador 3D para router CNC — 100 % no navegador.",
  audience: "Feito para quem tem uma router hobby ou de pequena oficina (3018, 3040, 6040, 6090, 1010, 1325…) e quer sair do desenho para o G-code sem instalar nada.",
  url: "https://oficina-cnc.vercel.app",
  repository: "", // preencher se o repositório for público
  license: "Todos os direitos reservados © 2026 Kleber Andrade. Uso pessoal e educacional livre; o código-fonte pode ser aberto no futuro.",
} as const;

export const AUTHOR = {
  name: "Kleber Andrade",
  email: "pdjkleber@gmail.com",
  role: "idealizador, projeto e desenvolvimento",
} as const;

export const THIRD_PARTY: { name: string; license: string; url: string }[] = [
  { name: "React", license: "MIT", url: "https://react.dev" },
  { name: "Three.js", license: "MIT", url: "https://threejs.org" },
  { name: "Konva / react-konva", license: "MIT", url: "https://konvajs.org" },
  { name: "Zustand / zundo", license: "MIT", url: "https://github.com/pmndrs/zustand" },
  { name: "clipper-lib", license: "Boost Software License 1.0", url: "https://github.com/junmer/clipper-lib" },
  { name: "opentype.js", license: "MIT", url: "https://opentype.js.org" },
  { name: "dxf-parser", license: "MIT", url: "https://github.com/gdsestimating/dxf-parser" },
  { name: "svg-path-properties", license: "MIT", url: "https://github.com/rveciana/svg-path-properties" },
  { name: "lucide-react (ícones)", license: "ISC", url: "https://lucide.dev" },
  { name: "Inter (fonte)", license: "SIL Open Font License 1.1", url: "https://rsms.me/inter" },
  { name: "Fraunces (fonte)", license: "SIL Open Font License 1.1", url: "https://github.com/undercasetype/Fraunces" },
  { name: "JetBrains Mono (fonte)", license: "SIL Open Font License 1.1", url: "https://www.jetbrains.com/lp/mono" },
  { name: "vite-plugin-pwa / Workbox", license: "MIT", url: "https://vite-pwa-org.netlify.app" },
];
