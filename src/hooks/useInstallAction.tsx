import { Download } from "lucide-react";
import { usePwaStore } from "../lib/pwa";

/** "Install app" menu entry helper: returns label + handler or null when not applicable. */
export function useInstallAction() {
  const canInstall = usePwaStore((s) => s.canInstall);
  const isIos = usePwaStore((s) => s.isIos);
  const isStandalone = usePwaStore((s) => s.isStandalone);
  const install = usePwaStore((s) => s.install);
  if (isStandalone) return null;
  if (canInstall) return { label: "Instalar aplicativo", icon: <Download size={16} />, run: () => void install() };
  if (isIos) return { label: "Instalar: Compartilhar → Adicionar à Tela de Início", icon: <Download size={16} />, run: () => {} };
  return null;
}
