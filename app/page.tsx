import Workspace from "./workspace";
import { getUser } from "../lib/auth";
import { services } from "../lib/server/services";
import { connectionStatus } from "../lib/ai-connections";
import type { WorkspaceSnapshot } from "../lib/domain/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getUser();
  const empty: WorkspaceSnapshot = { records: [], events: [], ai: false, user };
  if (!user)
    return <Workspace initial={{ snapshot: empty, requiresSignIn: true }} />;
  try {
    const backend = await services();
    const [data, ai] = await Promise.all([
      backend.workspace.load(user.userId),
      connectionStatus(backend.connections, user.userId),
    ]);
    return (
      <Workspace
        initial={{
          snapshot: {
            ...data,
            records: data.records as unknown as WorkspaceSnapshot["records"],
            user,
            ai: ai.configured,
          },
          requiresSignIn: false,
        }}
      />
    );
  } catch {
    return (
      <Workspace
        initial={{
          snapshot: empty,
          requiresSignIn: false,
          error:
            "Your workspace could not be loaded. Check the Catalyst storage configuration and try again.",
        }}
      />
    );
  }
}
