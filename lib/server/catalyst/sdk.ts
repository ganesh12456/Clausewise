import { Readable } from "node:stream";
import { zcAuth } from "@zcatalyst/auth";
import { Datastore } from "@zcatalyst/datastore";
import { Stratus } from "@zcatalyst/stratus";
import {
  CatalystStore,
  type Commit,
  type CommitIndex,
  type ObjectStorage,
} from "./store.ts";

const COMMIT_TABLE = "CWCommits",
  LOGIN_TABLE = "CWLoginSlots";
const checked = (value: string) => {
  if (!/^[a-f0-9:]+$/.test(value)) throw new Error("Invalid index key");
  return `'${value}'`;
};
export class CatalystIndex implements CommitIndex {
  private db: Datastore;
  constructor(db: Datastore) {
    this.db = db;
  }
  private async rows<T>(table: string, query: string): Promise<T[]> {
    return (await this.db.executeZCQLQuery(query)).map(
      (row) => row[table] as T,
    );
  }
  async latest(owner: string) {
    const rows = await this.rows<Commit>(
      COMMIT_TABLE,
      `SELECT * FROM ${COMMIT_TABLE} WHERE owner_key=${checked(owner)} ORDER BY revision DESC LIMIT 1`,
    );
    return rows[0] ? { ...rows[0], revision: Number(rows[0].revision) } : null;
  }
  async find(key: string) {
    return (
      (
        await this.rows<Commit>(
          COMMIT_TABLE,
          `SELECT * FROM ${COMMIT_TABLE} WHERE commit_key=${checked(key)} LIMIT 1`,
        )
      )[0] || null
    );
  }
  async insert(row: Commit) {
    await this.db.table(COMMIT_TABLE).insertRow(row);
  }
  async claimLogin(
    owner: string,
    window: number,
    slot: number,
    expires: number,
  ) {
    const slot_key = `${owner}:${window}:${slot}`;
    try {
      await this.db
        .table(LOGIN_TABLE)
        .insertRow({ slot_key, owner_key: owner, expires });
    } catch (error) {
      // Confirm contention by reading the exact unique key. Other errors must fail closed.
      const rows = await this.rows(
        LOGIN_TABLE,
        `SELECT ROWID FROM ${LOGIN_TABLE} WHERE slot_key=${checked(slot_key)} LIMIT 1`,
      );
      if (rows.length) return false;
      throw error;
    }
    // Bounded housekeeping; failure must not undo an allocated rate-limit slot.
    try {
      const old = await this.rows<{ ROWID: string }>(
        LOGIN_TABLE,
        `SELECT ROWID FROM ${LOGIN_TABLE} WHERE owner_key=${checked(owner)} AND expires<${Date.now()} LIMIT 100`,
      );
      if (old.length)
        await this.db.table(LOGIN_TABLE).deleteRows(old.map((r) => r.ROWID));
    } catch {
      /* retry cleanup after a later successful allocation */
    }
    return true;
  }
  async health() {
    for (const [table, unique] of [
      [COMMIT_TABLE, "commit_key"],
      [LOGIN_TABLE, "slot_key"],
    ]) {
      const columns = await this.db.table(table).getAllColumns();
      if (
        !columns.some(
          (column) =>
            column.column_name === unique && column.is_unique === true,
        )
      )
        throw new Error(`${table} requires a unique ${unique} column`);
      await this.db.executeZCQLQuery(`SELECT ROWID FROM ${table} LIMIT 1`);
    }
  }
}
export class StratusObjects implements ObjectStorage {
  private bucket: ReturnType<Stratus["bucket"]>;
  private service: Stratus;
  private name: string;
  constructor(
    bucket: ReturnType<Stratus["bucket"]>,
    service: Stratus,
    name: string,
  ) {
    this.bucket = bucket;
    this.service = service;
    this.name = name;
  }
  async put(key: string, bytes: Uint8Array, contentType: string) {
    await this.bucket.putObject(key, Readable.from([Buffer.from(bytes)]), {
      contentType,
    });
  }
  async get(key: string) {
    const stream = await this.bucket.getObject(key),
      chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of stream) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > 32 * 1024 * 1024) {
        stream.destroy();
        throw new Error("Stored object exceeds size limit");
      }
      chunks.push(bytes);
    }
    return Buffer.concat(chunks);
  }
  async remove(key: string) {
    await this.bucket.deleteObjects([{ key }]);
  }
  async health() {
    if (!(await this.service.headBucket(this.name, true)))
      throw new Error("Stratus bucket unavailable");
  }
}
/** Never cache request credentials or put platform tokens in application environment variables. */
export async function createCatalystStore(headers: Record<string, string>) {
  const project = process.env.CATALYST_PROJECT_ID,
    bucket = process.env.CATALYST_STRATUS_BUCKET;
  if (!project || !bucket)
    throw new Error("Set CATALYST_PROJECT_ID and CATALYST_STRATUS_BUCKET");
  // Gateway-injected project headers bind this request to the configured Catalyst project.
  if (headers["x-zc-projectid"] !== project)
    throw new Error(
      "Catalyst runtime project context is missing or mismatched",
    );
  const app = await zcAuth.init(
    { headers } as unknown as Parameters<typeof zcAuth.init>[0],
    { scope: "admin" },
  );
  const datastore = new Datastore(app),
    stratus = new Stratus(app);
  return new CatalystStore(
    new CatalystIndex(datastore),
    new StratusObjects(stratus.bucket(bucket), stratus, bucket),
  );
}
