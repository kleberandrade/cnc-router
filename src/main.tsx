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
import { useUiStore, initUiPrefs } from './state/uiStore'
import { installErrorCapture } from "./lib/feedback";
import { initVitals, vitalsDebugEnabled } from "./lib/vitals";
import { startDerived } from "./state/derived";

installErrorCapture();
initUiPrefs();

initPwa()
onFontsChanged(() => useUiStore.getState().bumpFonts())
void loadEmbeddedFonts()
startDerived()
if (vitalsDebugEnabled()) initVitals({ debug: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
