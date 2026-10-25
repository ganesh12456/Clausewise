import type { PoolClient } from "pg";
import type {
  Activity,
  StoredRecord,
  WorkspaceRepository,
} from "../application/records.ts";
import type { RecordKind } from "../../domain/workspace.ts";
export type SqlConnection = Pick<PoolClient, "query">;
export class PostgresWorkspaceRepository implements WorkspaceRepository {
  private db: SqlConnection;
  constructor(db: SqlConnection) {
    this.db = db;
  }
  async list(owner: string) {
    return (
      await this.db.query(
        "SELECT id,owner,kind,data,revision,created FROM records WHERE owner=$1 ORDER BY created DESC",
        [owner],
      )
    ).rows as StoredRecord[];
  }
  async listEvents(owner: string) {
    return (
      await this.db.query(
        "SELECT * FROM events WHERE owner=$1 ORDER BY created DESC LIMIT 60",
        [owner],
      )
    ).rows as Activity[];
  }
  async findOwned(id: string, owner: string, kind: RecordKind, lock = false) {
    return (
      ((
        await this.db.query(
          "SELECT * FROM records WHERE id=$1 AND owner=$2 AND kind=$3" +
            (lock ? " FOR UPDATE" : ""),
          [id, owner, kind],
        )
      ).rows[0] as StoredRecord) || null
    );
  }
  async insert(r: StoredRecord, parent: string | null) {
    await this.db.query(
      "INSERT INTO records(id,owner,kind,data,created,parent_id) VALUES($1,$2,$3,$4,$5,$6)",
      [r.id, r.owner, r.kind, JSON.stringify(r.data), r.created, parent],
    );
  }
  async update(r: StoredRecord, parent: string | null) {
    await this.db.query(
      "UPDATE records SET data=$1,revision=$2,parent_id=$3 WHERE id=$4 AND owner=$5",
      [JSON.stringify(r.data), r.revision, parent, r.id, r.owner],
    );
  }
  async remove(id: string, owner: string) {
    await this.db.query("DELETE FROM records WHERE id=$1 AND owner=$2", [
      id,
      owner,
    ]);
  }
  async append(e: Activity) {
    await this.db.query("INSERT INTO events VALUES($1,$2,$3,$4,$5)", [
      e.id,
      e.owner,
      e.action,
      e.subject,
      e.created,
    ]);
  }
}
