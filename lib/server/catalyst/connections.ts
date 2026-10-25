import type { ConnectionStore } from "../../ai-connections.ts";
import type { CatalystStore, SavedConnection } from "./store.ts";
export class SnapshotConnections implements ConnectionStore {
  private store: CatalystStore;
  constructor(store: CatalystStore) {
    this.store = store;
  }
  async get(owner: string) {
    return (await this.store.read(owner)).state.connection;
  }
  async set(owner: string, value: SavedConnection) {
    await this.store.transact(owner, (state) => {
      state.connection = value;
    });
  }
  async clear(owner: string) {
    await this.store.transact(owner, (state) => {
      state.connection = null;
    });
  }
  async verify(owner: string, encrypted: string, verifiedAt: string) {
    await this.store.transact(owner, (state) => {
      if (state.connection?.encrypted_key === encrypted)
        state.connection.verified_at = verifiedAt;
    });
  }
}
