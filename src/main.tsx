import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite → work offline / in the installed PWA)
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import './index.css'
import App from './App.tsx'
import { initPwa } from './lib/pwa'
import { loadEmbeddedFonts, onFontsChanged } from './lib/text'
import { loadUserFonts } from './lib/userFonts'
import { useUiStore, initUiPrefs } from './state/uiStore'
import { installErrorCapture } from "./lib/feedback";
import { initVitals, vitalsDebugEnabled } from "./lib/vitals";
import { startDerived } from "./state/derived";
import { injectSpeedInsights } from "@vercel/speed-insights";

installErrorCapture();
initUiPrefs();

initPwa()
onFontsChanged(() => useUiStore.getState().bumpFonts())
void loadEmbeddedFonts()
void loadUserFonts()
startDerived()
if (vitalsDebugEnabled()) initVitals({ debug: true })

// Speed Insights com rota desde o primeiro byte: injetado aqui (não num componente React) para as
// medições que acontecem antes da hidratação não caírem como "Unknown" no painel (Sprint 29).
const speedInsights = injectSpeedInsights({ route: "/editor", framework: "react" })
let lastView = useUiStore.getState().view
useUiStore.subscribe((st) => {
  if (st.view !== lastView) {
    lastView = st.view
    speedInsights?.setRoute(st.view === "editor" ? "/editor" : st.view === "drawing" ? "/folha" : "/simulador")
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
