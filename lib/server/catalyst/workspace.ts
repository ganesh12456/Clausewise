import { randomUUID } from "node:crypto";
import {
  RecordService,
  type Activity,
  type StoredRecord,
  type WorkspaceRepository,
} from "../application/records.ts";
import type { RecordKind } from "../../domain/workspace.ts";
import {
  CatalystStore,
  OutcomeUnknownError,
  type WorkspaceState,
} from "./store.ts";

/** Transaction-local repository. CatalystStore publishes the entire change atomically. */
export class SnapshotWorkspaceRepository implements WorkspaceRepository {
  private state: WorkspaceState;
  constructor(state: WorkspaceState) {
    this.state = state;
  }
  async list(owner: string) {
    return this.state.records
      .filter((r) => r.owner === owner)
      .sort((a, b) => b.created.localeCompare(a.created));
  }
  async listEvents(owner: string) {
    return this.state.events
      .filter((e) => e.owner === owner)
      .slice(-60)
      .reverse();
  }
  async findOwned(id: string, owner: string, kind: RecordKind) {
    return (
      this.state.records.find(
        (r) => r.id === id && r.owner === owner && r.kind === kind,
      ) || null
    );
  }
  async insert(record: StoredRecord) {
    this.state.records.push(record);
  }
  async update(record: StoredRecord) {
    this.state.records = this.state.records.map((r) =>
      r.id === record.id && r.owner === record.owner ? record : r,
    );
  }
  async remove(id: string, owner: string) {
    const ids = new Set(
      this.state.records
        .filter(
          (r) =>
            r.owner === owner &&
            (r.id === id ||
              (r.kind === "obligation" && r.data.contractId === id)),
        )
        .map((r) => r.id),
    );
    this.state.records = this.state.records.filter((r) => !ids.has(r.id));
    for (const removed of ids) {
      if (this.state.originals[removed])
        this.state.garbage.push(this.state.originals[removed]);
      delete this.state.originals[removed];
    }
  }
  async append(event: Activity) {
    this.state.events.push(event);
  }
}
export class CloudWorkspace {
  readonly store: CatalystStore;
  constructor(store: CatalystStore) {
    this.store = store;
  }
  async load(owner: string) {
    const { state } = await this.store.read(owner);
    return new RecordService(new SnapshotWorkspaceRepository(state)).load(
      owner,
    );
  }
  async save(owner: string, input: unknown) {
    return this.store.transact(owner, (state) =>
      new RecordService(new SnapshotWorkspaceRepository(state)).save(
        owner,
        input,
      ),
    );
  }
  async findContract(owner: string, id: string) {
    return new SnapshotWorkspaceRepository(
      (await this.store.read(owner)).state,
    ).findOwned(id, owner, "contract");
  }
  async upload(
    owner: string,
    filename: string,
    data: Record<string, unknown>,
    bytes: Uint8Array,
  ) {
    const id = randomUUID(),
      key = this.store.originalKey(owner, id);
    await this.store.objects.put(key, bytes, "application/octet-stream");
    try {
      return await this.store.transact(owner, (state) => {
        const created = new Date().toISOString();
        state.records.push({
          id,
          owner,
          kind: "contract",
          data: data as StoredRecord["data"],
          revision: 1,
          created,
        });
        state.originals[id] = key;
        state.events.push({
          id: randomUUID(),
          owner,
          action: "Uploaded contract",
          subject: filename,
          created,
        });
        return { id };
      });
    } catch (error) {
      if (!(error instanceof OutcomeUnknownError))
        await this.store.objects.remove(key).catch(() => undefined);
      throw error;
    }
  }
  async original(owner: string, id: string) {
    const { state } = await this.store.read(owner);
    const record = await new SnapshotWorkspaceRepository(state).findOwned(
      id,
      owner,
      "contract",
    );
    const key = state.originals[id];
    if (!record || !key) return null;
    if (key !== this.store.originalKey(owner, id))
      throw new Error("Invalid original reference");
    return { data: record.data, content: await this.store.objects.get(key) };
  }
}
