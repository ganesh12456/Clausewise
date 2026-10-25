import { cookies } from "next/headers";
import { services } from "../../../lib/server/services";
import { sameOrigin } from "../../../lib/auth";
import {
  COOKIE,
  equal,
  issueSession,
  ownerEmail,
  validPassword,
} from "../../../lib/session";
import { endpoint, HttpError, limitedBody } from "../../../lib/http";
export const runtime = "nodejs";
export const POST = endpoint(async (req) => {
  if (!sameOrigin(req)) throw new HttpError("Invalid origin", 403);
  const body = JSON.parse(
    new TextDecoder().decode(await limitedBody(req, 5000)),
  );
  const c = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  if (body.action === "logout") {
    c.set(COOKIE, "", { ...options, maxAge: 0 });
    return Response.json({ ok: true });
  }
  if (
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.password.length > 1024
  )
    throw new HttpError("Invalid credentials", 401);
  if (!(await (await services()).store.loginAttempt(ownerEmail())))
    throw new HttpError(
      "Too many sign-in attempts. Try again in 15 minutes.",
      429,
    );
  const correct = validPassword(body.password);
  if (!equal(body.email.trim().toLowerCase(), ownerEmail()) || !correct)
    throw new HttpError("Invalid credentials", 401);
  c.set(COOKIE, issueSession(), { ...options, maxAge: 8 * 60 * 60 });
  return Response.json({ ok: true });
});
