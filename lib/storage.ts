import { HttpError } from "./http.ts";
import { RecordError, RecordService } from "./server/application/records.ts";
import {
  PostgresWorkspaceRepository,
  type SqlConnection,
} from "./server/repositories/postgres-workspace.ts";
export function workspace(db: SqlConnection, owner: string) {
  return new RecordService(new PostgresWorkspaceRepository(db)).load(owner);
}
export async function saveRecord(
  db: SqlConnection,
  owner: string,
  input: unknown,
) {
  try {
    return await new RecordService(new PostgresWorkspaceRepository(db)).save(
      owner,
      input,
    );
  } catch (e) {
    if (e instanceof RecordError)
      throw new HttpError(
        e.message,
        e.code === "not_found" ? 404 : e.code === "conflict" ? 409 : 400,
      );
    throw e;
  }
}
export async function event(
  db: SqlConnection,
  owner: string,
  action: string,
  subject: string,
) {
  await new PostgresWorkspaceRepository(db).append({
    id: crypto.randomUUID(),
    owner,
    action,
    subject,
    created: new Date().toISOString(),
  });
}
export async function insertDocument(
  db: SqlConnection,
  owner: string,
  filename: string,
  data: Record<string, unknown>,
  bytes: Uint8Array,
) {
  const id = crypto.randomUUID();
  await db.query(
    "INSERT INTO records(id,owner,kind,data,created) VALUES($1,$2,$3,$4,$5)",
    [id, owner, "contract", JSON.stringify(data), new Date().toISOString()],
  );
  await db.query("INSERT INTO originals VALUES($1,$2)", [
    id,
    Buffer.from(bytes),
  ]);
  await event(db, owner, "Uploaded contract", filename);
  return { id };
}
