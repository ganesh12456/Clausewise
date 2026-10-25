import { getUser, sameOrigin } from "../../../lib/auth";
import { services } from "../../../lib/server/services";
import { connectionStatus } from "../../../lib/ai-connections";
import { storageError } from "../../../lib/storage";
import { endpoint, HttpError, limitedBody } from "../../../lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = endpoint(async () => {
  const u = await getUser();
  if (!u) throw new HttpError("Sign in required", 401);
  const b = await services();
  return Response.json(
    {
      ...(await b.workspace.load(u.userId)),
      user: u,
      ai: (await connectionStatus(b.connections, u.userId)).configured,
      email: false,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
export const POST = endpoint(async (req) => {
  const u = await getUser();
  if (!u) throw new HttpError("Sign in required", 401);
  if (!sameOrigin(req)) throw new HttpError("Invalid origin", 403);
  const x = JSON.parse(
    new TextDecoder().decode(await limitedBody(req, 2100000)),
  );
  try {
    return Response.json(await (await services()).workspace.save(u.userId, x));
  } catch (error) {
    storageError(error);
  }
});
