import { headers } from "next/headers";
import { createCatalystStore } from "./catalyst/sdk.ts";
import { CloudWorkspace } from "./catalyst/workspace.ts";
import { SnapshotConnections } from "./catalyst/connections.ts";

export async function services() {
  const store = await createCatalystStore(
    Object.fromEntries((await headers()).entries()),
  );
  return {
    store,
    workspace: new CloudWorkspace(store),
    connections: new SnapshotConnections(store),
  };
}
