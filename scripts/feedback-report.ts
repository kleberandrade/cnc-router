// Lista os envios de feedback guardados no Vercel Blob e imprime uma tabela.
// Uso: BLOB_READ_WRITE_TOKEN=... npx tsx scripts/feedback-report.ts [AAAA-MM] [--json]
import { list } from "@vercel/blob";

const month = process.argv[2] && /^\d{4}-\d{2}$/.test(process.argv[2]) ? process.argv[2] : "";
const asJson = process.argv.includes("--json");

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error("Defina BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob → .env)."); process.exit(1); }
  const prefix = month ? `feedback/${month}/` : "feedback/";
  const out: { receivedAt: string; type: string; title: string; email?: string; id: string; version?: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 100 });
    for (const b of page.blobs) {
      const res = await fetch(b.downloadUrl ?? b.url, { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
      const j = (await res.json()) as { receivedAt: string; type: string; title: string; email?: string; id: string; diagnostics?: { version?: string } };
      out.push({ receivedAt: j.receivedAt, type: j.type, title: j.title, email: j.email, id: j.id, version: j.diagnostics?.version, url: b.url });
    }
    cursor = page.cursor;
  } while (cursor);
  out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  if (asJson) { console.log(JSON.stringify(out, null, 2)); return; }
  console.log(`${out.length} envio(s)${month ? ` em ${month}` : ""}\n`);
  for (const r of out) console.log(`${r.receivedAt.slice(0, 16)}  ${r.type.padEnd(8)}  ${(r.version ?? "").padEnd(8)}  ${r.id}  ${r.title}${r.email ? `  <${r.email}>` : ""}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
