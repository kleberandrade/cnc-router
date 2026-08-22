import { FONTS, registerFont, isFontLoaded } from "./text";
import type { Shape } from "../types";

/**
 * Fonts the user loaded from their own `.ttf`/`.otf` files.
 *
 * They live in IndexedDB, not in `localStorage`: a font file is hundreds of KB and the persisted
 * project already shares that quota with everything else. The project only stores the `fontId`, so
 * a font that is gone shows a warning instead of silently swallowing the text.
 *
 * A user font never travels with the project — not in the exported `.json`, not in the share link.
 * Redistributing a font file is a licensing problem we do not want to hand to anyone, and the link
 * has an 8 000-character ceiling that a font would blow through anyway. "Explodir texto" is the way
 * to take the lettering somewhere else.
 */

const DB_NAME = "oficina-cnc";
const DB_VERSION = 1;
const STORE = "fonts";
/** Marks a font id as coming from the user, so it can be told apart from the embedded ones. */
export const USER_FONT_PREFIX = "user:";

export interface UserFontRecord {
  id: string;
  label: string;
  data: ArrayBuffer;
}

const hasIndexedDB = () => typeof indexedDB !== "undefined";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB indisponível"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Falha ao ler as fontes"));
      })
  );
}

/** Build the id used for a font loaded from `fileName`. */
export const userFontId = (fileName: string): string =>
  USER_FONT_PREFIX + fileName.replace(/\.(ttf|otf)$/i, "").trim().toLowerCase();

/** A readable label from the file name: "Bebas_Neue-Regular.ttf" → "Bebas Neue Regular". */
export const userFontLabel = (fileName: string): string =>
  fileName.replace(/\.(ttf|otf)$/i, "").replace(/[_-]+/g, " ").trim() || fileName;

export const isUserFont = (id: string): boolean => id.startsWith(USER_FONT_PREFIX);

/**
 * Register a font file and keep it for the next visit.
 * Throws when the file is not a font opentype.js can read.
 */
export async function addUserFont(fileName: string, data: ArrayBuffer): Promise<{ id: string; label: string }> {
  const id = userFontId(fileName);
  const label = userFontLabel(fileName);
  registerFont(id, data, label); // throws on a file that is not a font — before anything is stored
  if (hasIndexedDB()) {
    try {
      await tx("readwrite", (store) => store.put({ id, label, data } satisfies UserFontRecord));
    } catch {
      /* private mode / quota: the font still works this session, it just will not come back */
    }
  }
  return { id, label };
}

/** Register every stored user font. Safe to call more than once. */
export async function loadUserFonts(): Promise<string[]> {
  if (!hasIndexedDB()) return [];
  let records: UserFontRecord[];
  try {
    records = (await tx<UserFontRecord[]>("readonly", (store) => store.getAll() as IDBRequest<UserFontRecord[]>)) ?? [];
  } catch {
    return [];
  }
  const loaded: string[] = [];
  for (const r of records) {
    if (isFontLoaded(r.id)) { loaded.push(r.id); continue; }
    try {
      registerFont(r.id, r.data, r.label);
      loaded.push(r.id);
    } catch {
      /* stored bytes no longer parse: skip it rather than blocking the other fonts */
    }
  }
  return loaded;
}

export async function removeUserFont(id: string): Promise<void> {
  const i = FONTS.findIndex((f) => f.id === id);
  if (i >= 0) FONTS.splice(i, 1);
  if (!hasIndexedDB()) return;
  try {
    await tx("readwrite", (store) => store.delete(id));
  } catch {
    /* nothing stored to remove */
  }
}

/** Font ids used by text shapes that are not registered — the text would fall back to Inter. */
export function missingFonts(shapes: Shape[]): string[] {
  const ids = new Set<string>();
  for (const s of shapes) {
    if (s.kind === "text" && !isFontLoaded(s.fontId)) ids.add(s.fontId);
  }
  return [...ids];
}

/** Human name for a missing font id ("user:bebas neue" → "Bebas neue"). */
export function fontDisplayName(id: string): string {
  const known = FONTS.find((f) => f.id === id);
  if (known) return known.label;
  const bare = isUserFont(id) ? id.slice(USER_FONT_PREFIX.length) : id;
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}
