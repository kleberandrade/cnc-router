import { useProjectStore } from "../state/store";
import { useUiStore } from "../state/uiStore";
import { parseProject } from "../lib/projectFile";
import { loadUserFonts, missingFonts, fontDisplayName } from "../lib/userFonts";
import { confirmDialog } from "./Dialog";
import { findExample } from "../content/examples";

/**
 * One front door for every way a file can arrive (Sprint 29): the menu's file picker, a drop on the
 * window, or a paste. Everything routes into the same dialogs — dropping a DXF never skips the
 * import preview, and an image never skips the trace dialog.
 */

/** Open a project `.json` from its text, warning when a user font is missing. Returns false when the file does not parse. */
export async function openProjectFromText(text: string, fileName: string): Promise<boolean> {
  const setNotice = useUiStore.getState().setNotice;
  try {
    const project = parseProject(text);
    useProjectStore.getState().loadProject(project);
    // fonte do usuário vive no navegador, não no arquivo: só dá para conferir depois de registrá-las
    await loadUserFonts();
    const semFonte = missingFonts(project.shapes);
    if (semFonte.length > 0) {
      setNotice({
        kind: "warning",
        title: `Esse projeto usa ${semFonte.length > 1 ? "fontes que não estão" : "uma fonte que não está"} aqui — o texto está saindo na Inter. Carregue o arquivo da fonte no painel, ou explode o texto em contornos.`,
        details: semFonte.map(fontDisplayName),
      });
    } else {
      setNotice({ kind: "info", title: `Abri “${fileName}” — ${project.shapes.length} peça${project.shapes.length === 1 ? "" : "s"}.` });
    }
    return true;
  } catch (err) {
    setNotice({ kind: "error", title: (err as Error).message });
    return false;
  }
}

const isImageFile = (file: File) =>
  /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name) || (/^image\//.test(file.type) && !/svg/.test(file.type));

/** Route one incoming file (drop or picker) into the right dialog. */
export async function importFile(file: File, { confirmReplace = false } = {}): Promise<void> {
  const ui = useUiStore.getState();
  if (isImageFile(file)) {
    ui.setImageFile(file);
    return;
  }
  if (/\.json$/i.test(file.name)) {
    if (confirmReplace && useProjectStore.getState().shapes.length > 0) {
      const ok = await confirmDialog({
        title: "Abrir esse projeto?",
        message: `“${file.name}” vai entrar no lugar do que está na mesa. Salve antes se quiser guardar o atual.`,
        confirmLabel: "Abrir",
      });
      if (!ok) return;
    }
    await openProjectFromText(await file.text(), file.name);
    return;
  }
  if (/\.(svg|dxf)$/i.test(file.name) || /svg/.test(file.type)) {
    // o diálogo é quem faz o parse: ele re-lê a cada mudança de opção
    ui.setVectorFile({ file, text: await file.text() });
    return;
  }
  ui.setNotice({ kind: "warning", title: `${file.name} não é um formato que eu abro — aceito DXF, SVG, imagem e projeto .json.` });
}

/** Files dropped on the window: the first one goes in; the rest get a heads-up. */
export async function importDropped(files: FileList | File[]): Promise<void> {
  const list = Array.from(files);
  if (list.length === 0) return;
  await importFile(list[0], { confirmReplace: true });
  if (list.length > 1) {
    useUiStore.getState().setNotice({ kind: "info", title: `Abri ${list[0].name}. Solte os outros ${list.length - 1} um de cada vez.` });
  }
}

/** Paste (Ctrl+V): an image from the clipboard, or SVG markup copied as text. */
export async function importPasted(data: DataTransfer): Promise<boolean> {
  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && /^image\//.test(item.type)) {
      const file = item.getAsFile();
      if (file) {
        await importFile(new File([file], file.name || "colada.png", { type: file.type }));
        return true;
      }
    }
  }
  const text = data.getData("text/plain").trim();
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))) {
    useUiStore.getState().setVectorFile({ file: new File([text], "colado.svg", { type: "image/svg+xml" }), text });
    return true;
  }
  return false;
}

/** Abre um exemplo da galeria pelo id, com confirmação se houver peças na mesa. Usado pelo menu e pelos links da landing (`?exemplo=`). */
export async function openExampleById(id: string): Promise<boolean> {
  const ex = findExample(id);
  if (!ex) return false;
  const ui = useUiStore.getState();
  if (useProjectStore.getState().shapes.length > 0 &&
      !(await confirmDialog({ title: `Abrir o exemplo "${ex.title}"?`, message: "As peças que estão na mesa serão substituídas. Se quiser guardar, salve o projeto antes.", confirmLabel: "Abrir exemplo" }))) return false;
  const { shapes, settings } = await ex.build();
  useProjectStore.getState().loadProject({ shapes, settings });
  ui.setSection("shape");
  ui.setNotice({ kind: "info", title: `Exemplo "${ex.title}" aberto.`, details: [ex.teaches] });
  ui.setView("editor");
  return true;
}
