import { put } from "@vercel/blob";
import { handleFeedback } from "./_lib/feedback-core.js";

/**
 * POST /api/feedback — stores suggestions / bug reports as private JSON blobs in Vercel Blob
 * (`feedback/AAAA-MM/<timestamp>-<tipo>-<id>.json`). Requires BLOB_READ_WRITE_TOKEN; without it
 * returns 501 so the app can fall back to e-mail.
 */
const ORIGINS = ["https://oficina-cnc.vercel.app", "https://cnc-router.vercel.app", "http://localhost:5173", "http://localhost:4173"];

async function handler(req: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(JSON.stringify({ error: "canal de feedback não configurado (BLOB_READ_WRITE_TOKEN ausente)" }), { status: 501, headers: { "content-type": "application/json" } });
  }
  return handleFeedback(req, {
    origins: [...ORIGINS, ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []), ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : [])],
    save: async (pathname, body) => {
      const blob = await put(pathname, body, { access: "private", contentType: "application/json", addRandomSuffix: false });
      return { url: blob.url };
    },
  });
}

export const POST = handler;
export const OPTIONS = handler;
export const GET = handler;
export default handler;
