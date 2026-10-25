import { encryptCredential, decryptCredential } from "./credential-vault.ts";
import { HttpError } from "./http.ts";
import type { SavedConnection } from "./server/catalyst/store.ts";
export interface ConnectionStore {
  get(owner: string): Promise<SavedConnection | null>;
  set(owner: string, value: SavedConnection): Promise<void>;
  clear(owner: string): Promise<void>;
  verify(owner: string, encrypted: string, verifiedAt: string): Promise<void>;
}
export const DEFAULT_MODEL = "gemini-2.5-flash";
export async function connectionStatus(db: ConnectionStore, owner: string) {
  const r = await db.get(owner);
  return {
    configured: !!r,
    model: r?.model || DEFAULT_MODEL,
    updatedAt: r?.updated_at || null,
    verifiedAt: r?.verified_at || null,
  };
}
export async function saveConnection(
  db: ConnectionStore,
  owner: string,
  key: unknown,
  model: unknown,
) {
  if (
    typeof key !== "string" ||
    key.trim().length < 16 ||
    key.length > 512 ||
    /\s/.test(key.trim())
  )
    throw new HttpError("Enter a valid Gemini API key");
  if (
    typeof model !== "string" ||
    !/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model)
  )
    throw new HttpError("Enter a Gemini model ID");
  const encrypted = encryptCredential(owner, key.trim());
  await db.set(owner, {
    encrypted_key: encrypted,
    model,
    updated_at: new Date().toISOString(),
    verified_at: null,
  });
  return connectionStatus(db, owner);
}
export async function removeConnection(db: ConnectionStore, owner: string) {
  await db.clear(owner);
  return connectionStatus(db, owner);
}
export async function loadConnection(db: ConnectionStore, owner: string) {
  const r = await db.get(owner);
  if (!r) return null;
  try {
    return {
      key: decryptCredential(owner, r.encrypted_key),
      model: r.model,
      encrypted: r.encrypted_key,
    };
  } catch {
    throw new HttpError(
      "The saved key cannot be decrypted. Enter it again in Settings.",
      409,
    );
  }
}
export async function testConnection(
  db: ConnectionStore,
  owner: string,
  request: typeof fetch = fetch,
) {
  const c = await loadConnection(db, owner);
  if (!c) throw new HttpError("Save an API key in Settings first", 409);
  let r: Response;
  try {
    r = await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}`,
      {
        headers: { "x-goog-api-key": c.key },
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new HttpError("Could not reach Gemini. Try again shortly.", 502);
  }
  if (!r.ok)
    throw new HttpError(
      r.status === 429
        ? "Gemini rate limit reached. Try again later."
        : "Gemini rejected the connection. Check the key and model access.",
      r.status === 429 ? 429 : 422,
    );
  const model = await r.json();
  if (
    !Array.isArray(model.supportedGenerationMethods) ||
    !model.supportedGenerationMethods.includes("generateContent")
  )
    throw new HttpError("This model does not support content generation", 422);
  // Do not mark a replacement key as verified if it changed during the provider check.
  await db.verify(owner, c.encrypted, new Date().toISOString());
  return connectionStatus(db, owner);
}
