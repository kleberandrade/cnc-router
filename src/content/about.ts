/** Product and author facts shown in "Sobre", README and the G-code header. Keep in one place. */
export const PRODUCT = {
  name: "Oficina CNC",
  tagline: "Desenhe, simule e exporte G-code no navegador — sem instalar nada.",
  audience: "Para quem tem uma router de hobby ou de pequena oficina (3018, 3040, 6040…) e quer ir do desenho ao G-code sem outro programa.",
  url: "https://oficina-cnc.vercel.app",
  repository: "", // preencher se o repositório for público
  license: "MIT © 2026 Kleber Andrade. Componentes de terceiros mantêm suas próprias licenças.",
} as const;

export const AUTHOR = {
  name: "Kleber Andrade",
  email: "pdjkleber@gmail.com",
  url: "https://kleberandrade.dev",
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
  { name: "svg-path-properties", license: "ISC", url: "https://github.com/rveciana/svg-path-properties" },
  { name: "lucide-react (ícones)", license: "ISC", url: "https://lucide.dev" },
  { name: "Inter (fonte)", license: "SIL Open Font License 1.1", url: "https://rsms.me/inter" },
  { name: "Fraunces (fonte)", license: "SIL Open Font License 1.1", url: "https://github.com/undercasetype/Fraunces" },
  { name: "JetBrains Mono (fonte)", license: "SIL Open Font License 1.1", url: "https://www.jetbrains.com/lp/mono" },
  { name: "vite-plugin-pwa / Workbox", license: "MIT", url: "https://vite-pwa-org.netlify.app" },
];
