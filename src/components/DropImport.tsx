import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { importDropped, importPasted } from "./importEntry";

/**
 * Window-level drag & drop + paste (Sprint 29). Renders only the "solte aqui" overlay; the routing
 * lives in `importEntry.ts` so the menu picker and the drop share one path.
 */
export function DropImport() {
  const [over, setOver] = useState(false);

  useEffect(() => {
    // depth counter: dragenter/dragleave fire for every child the cursor crosses
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setOver(true);
    };
    const overH = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // sem isso o navegador abre o arquivo no lugar do app
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      if (e.dataTransfer?.files.length) void importDropped(e.dataTransfer.files);
    };
    const paste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing || !e.clipboardData) return;
      void importPasted(e.clipboardData).then((handled) => { if (handled) e.preventDefault(); });
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", overH);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", overH);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, []);

  if (!over) return null;
  return (
    <div className="drop-overlay" data-testid="drop-overlay" role="presentation">
      <div className="drop-card">
        <FileDown size={28} aria-hidden="true" />
        <p>Solte aqui: DXF, SVG, imagem ou projeto .json</p>
      </div>
    </div>
  );
}
