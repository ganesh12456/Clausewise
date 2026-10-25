import { services } from "../../../lib/server/services";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await (await services()).store.health();
    return Response.json(
      { status: "ok", storage: "catalyst" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "not_ready" }, { status: 503 });
  }
}
