import { createHash, randomUUID } from "node:crypto";
import {
  RecordError,
  type StoredRecord,
  type Activity,
} from "../application/records.ts";

export type SavedConnection = {
  encrypted_key: string;
  model: string;
  updated_at: string;
  verified_at: string | null;
};
export type WorkspaceState = {
  records: StoredRecord[];
  events: Activity[];
  originals: Record<string, string>;
  connection: SavedConnection | null;
  garbage: string[];
};
export type Commit = {
  commit_key: string;
  owner_key: string;
  revision: number;
  payload_key: string;
  payload_hash: string;
  created: string;
};
export interface CommitIndex {
  latest(ownerKey: string): Promise<Commit | null>;
  find(commitKey: string): Promise<Commit | null>;
  insert(commit: Commit): Promise<void>;
  claimLogin(
    ownerKey: string,
    window: number,
    slot: number,
    expires: number,
  ): Promise<boolean>;
  health(): Promise<void>;
}
export interface ObjectStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
  health(): Promise<void>;
}
export class OutcomeUnknownError extends Error {}
export const ownerKey = (owner: string) =>
  createHash("sha256").update(owner).digest("hex");
export const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const empty = (): WorkspaceState => ({
  records: [],
  events: [],
  originals: {},
  connection: null,
  garbage: [],
});
const prefix = (owner: string) => `cw/${ownerKey(owner)}/`;
const MAX_SNAPSHOT = 32 * 1024 * 1024;

/** A unique Data Store commit row publishes one immutable Stratus snapshot.
 * Business changes and audit entries become visible together. No SQL locks or disk state.
 */
export class CatalystStore {
  readonly index: CommitIndex;
  readonly objects: ObjectStorage;
  constructor(index: CommitIndex, objects: ObjectStorage) {
    this.index = index;
    this.objects = objects;
  }
  async health() {
    await Promise.all([this.index.health(), this.objects.health()]);
  }
  async read(
    owner: string,
  ): Promise<{ state: WorkspaceState; commit: Commit | null }> {
    for (let retry = 0; retry < 3; retry++) {
      const commit = await this.index.latest(ownerKey(owner));
      if (!commit) return { state: empty(), commit: null };
      if (
        commit.owner_key !== ownerKey(owner) ||
        !commit.payload_key.startsWith(prefix(owner))
      )
        throw new Error("Invalid workspace reference");
      let bytes;
      try {
        bytes = await this.objects.get(commit.payload_key);
      } catch (error) {
        // A reader may have selected a superseded snapshot just before cleanup.
        if (
          (await this.index.latest(ownerKey(owner)))?.payload_key !==
          commit.payload_key
        )
          continue;
        throw error;
      }
      if (bytes.length > MAX_SNAPSHOT || digest(bytes) !== commit.payload_hash)
        throw new Error("Workspace integrity check failed");
      const envelope = JSON.parse(Buffer.from(bytes).toString("utf8"));
      const state: WorkspaceState = envelope.state;
      if (
        envelope.version !== 1 ||
        envelope.owner !== owner ||
        !Array.isArray(state?.records) ||
        !Array.isArray(state?.events) ||
        !Array.isArray(state?.garbage) ||
        !state.originals
      )
        throw new Error("Invalid workspace snapshot");
      if (
        state.records.some((r) => r.owner !== owner) ||
        state.events.some((e) => e.owner !== owner)
      )
        throw new Error("Workspace owner mismatch");
      state.garbage = await this.clean(owner, state.garbage, [
        commit.payload_key,
        ...Object.values(state.originals),
      ]);
      return { state, commit };
    }
    throw new Error("Workspace changed during read. Retry.");
  }
  private async clean(owner: string, keys: string[], active: string[]) {
    const pending: string[] = [];
    for (const key of [...new Set(keys)]) {
      if (!key.startsWith(prefix(owner)) || active.includes(key))
        throw new Error("Invalid cleanup reference");
      try {
        await this.objects.remove(key);
      } catch {
        pending.push(key);
      }
    }
    return pending;
  }
  async transact<T>(
    owner: string,
    work: (state: WorkspaceState) => Promise<T> | T,
  ): Promise<T> {
    const { state, commit } = await this.read(owner);
    const draft = structuredClone(state);
    const result = await work(draft);
    draft.events = draft.events.slice(-60);
    if (commit) draft.garbage.push(commit.payload_key);
    draft.garbage = [...new Set(draft.garbage)];
    const bytes = Buffer.from(
      JSON.stringify({ version: 1, owner, state: draft }),
      "utf8",
    );
    if (bytes.length > MAX_SNAPSHOT)
      throw new RecordError(
        "Workspace exceeds the 32 MB review-data limit. Export and remove unused agreements.",
      );
    const revision = (commit?.revision || 0) + 1;
    const row: Commit = {
      commit_key: `${ownerKey(owner)}:${revision}`,
      owner_key: ownerKey(owner),
      revision,
      payload_key: `${prefix(owner)}snapshots/${randomUUID()}.json`,
      payload_hash: digest(bytes),
      created: new Date().toISOString(),
    };
    await this.objects.put(row.payload_key, bytes, "application/json");
    try {
      await this.index.insert(row);
    } catch (error) {
      let published;
      try {
        published = await this.index.find(row.commit_key);
      } catch {
        throw new OutcomeUnknownError(
          "Save outcome could not be confirmed. Refresh before retrying.",
        );
      }
      if (!published)
        throw new OutcomeUnknownError(
          "Save outcome could not be confirmed. Refresh before retrying.",
        );
      if (published.payload_key !== row.payload_key) {
        await this.objects.remove(row.payload_key).catch(() => undefined);
        throw new RecordError(
          "Workspace changed. Refresh before saving.",
          "conflict",
        );
      }
      // The network failed after the row committed. Treat this save as successful.
    }
    await this.clean(owner, draft.garbage, [
      row.payload_key,
      ...Object.values(draft.originals),
    ]);
    return result;
  }
  originalKey(owner: string, id: string) {
    return `${prefix(owner)}originals/${id}`;
  }
  async loginAttempt(owner: string, now = Date.now()) {
    const window = Math.floor(now / 900000);
    for (let slot = 0; slot < 10; slot++) {
      if (
        await this.index.claimLogin(
          ownerKey(owner),
          window,
          slot,
          (window + 1) * 900000,
        )
      )
        return true;
    }
    return false;
  }
}
