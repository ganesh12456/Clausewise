import { createHash } from "node:crypto";
import { services } from "../../../lib/server/services";
import { getUser, sameOrigin } from "../../../lib/auth";
import { endpoint, HttpError, limitedBody } from "../../../lib/http";
import { storageError } from "../../../lib/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = endpoint(async (req) => {
  const u = await getUser();
  if (!u) throw new HttpError("Sign in required", 401);
  const id = new URL(req.url).searchParams.get("id");
  const row = id
    ? await (await services()).workspace.original(u.userId, id)
    : null;
  if (!row) throw new HttpError("Not found", 404);
  return new Response(new Uint8Array(row.content), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(String(row.data.filename || "contract"))}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});
export const POST = endpoint(async (req) => {
  const u = await getUser();
  if (!u) throw new HttpError("Sign in required", 401);
  if (!sameOrigin(req)) throw new HttpError("Invalid origin", 403);
  const raw = await limitedBody(req, 30 * 1024 * 1024);
  const f = await new Response(raw, {
    headers: { "Content-Type": req.headers.get("content-type") || "" },
  }).formData();
  const file = f.get("file");
  const text = f.get("text");
  let pages;
  try {
    pages = JSON.parse(String(f.get("pages") || "[]"));
  } catch {
    throw new HttpError("Invalid page metadata");
  }
  if (
    !(file instanceof File) ||
    file.size > 20 * 1024 * 1024 ||
    file.name.length > 255 ||
    typeof text !== "string" ||
    !text.trim() ||
    text.length > 1500000 ||
    !Array.isArray(pages) ||
    pages.length > 100 ||
    pages.some(
      (p) =>
        !Number.isInteger(p.page) || p.page < 1 || typeof p.text !== "string",
    )
  )
    throw new HttpError(
      "Use a readable PDF, DOCX or TXT under 20 MB and 100 pages.",
    );
  if (!/\.(pdf|docx|txt)$/i.test(file.name))
    throw new HttpError("Unsupported format");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    /\.pdf$/i.test(file.name) &&
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    throw new HttpError("Invalid PDF");
  if (/\.docx$/i.test(file.name) && (bytes[0] !== 80 || bytes[1] !== 75))
    throw new HttpError("Invalid DOCX");
  const data = {
    name: file.name.replace(/\.[^.]+$/, ""),
    filename: file.name,
    text,
    pages,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    status: "Ready for review",
    findings: [],
    notes: "",
    coverage: String(f.get("coverage") || "Extracted text"),
  };
  try {
    return Response.json(
      await (
        await services()
      ).workspace.upload(u.userId, file.name, data, bytes),
    );
  } catch (error) {
    storageError(error);
  }
});
