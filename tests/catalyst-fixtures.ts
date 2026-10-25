import {
  CatalystStore,
  type Commit,
  type CommitIndex,
  type ObjectStorage,
} from "../lib/server/catalyst/store.ts";
export class MemoryIndex implements CommitIndex {
  commits = new Map<string, Commit>();
  slots = new Set<string>();
  failAfterInsert = false;
  failBeforeInsert = false;
  failFind = false;
  async latest(owner: string) {
    return (
      [...this.commits.values()]
        .filter((r) => r.owner_key === owner)
        .sort((a, b) => b.revision - a.revision)[0] || null
    );
  }
  async find(key: string) {
    if (this.failFind) throw new Error("network");
    return this.commits.get(key) || null;
  }
  async insert(commit: Commit) {
    if (this.failBeforeInsert) throw new Error("unconfirmed");
    if (this.commits.has(commit.commit_key)) throw new Error("duplicate");
    this.commits.set(commit.commit_key, structuredClone(commit));
    if (this.failAfterInsert) throw new Error("lost response");
  }
  async claimLogin(owner: string, window: number, slot: number) {
    const key = `${owner}:${window}:${slot}`;
    if (this.slots.has(key)) return false;
    this.slots.add(key);
    return true;
  }
  async health() {}
}
export class MemoryObjects implements ObjectStorage {
  files = new Map<string, Uint8Array>();
  failPut = false;
  failRemove = false;
  async put(key: string, bytes: Uint8Array) {
    if (this.failPut) throw new Error("upload failed");
    this.files.set(key, new Uint8Array(bytes));
  }
  async get(key: string) {
    const bytes = this.files.get(key);
    if (!bytes) throw new Error("missing");
    return new Uint8Array(bytes);
  }
  async remove(key: string) {
    if (this.failRemove) throw new Error("cleanup failed");
    this.files.delete(key);
  }
  async health() {}
}
export function fixture() {
  const index = new MemoryIndex(),
    objects = new MemoryObjects();
  return { index, objects, store: new CatalystStore(index, objects) };
}
