import type {
  WorkspaceSnapshot,
  WorkspaceRecord,
  RecordKind,
  CitedAnswer,
} from "../domain/workspace";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function requestJson<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(
    url,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await r.json();
  if (!r.ok)
    throw new ApiError(
      data.error || "We could not complete this request. Please try again.",
      r.status,
    );
  return data as T;
}
export interface WorkspaceGateway {
  load(): Promise<WorkspaceSnapshot>;
  save(
    record: WorkspaceRecord,
    data: WorkspaceRecord["data"],
  ): Promise<unknown>;
  create(kind: RecordKind, data: WorkspaceRecord["data"]): Promise<unknown>;
  remove(record: WorkspaceRecord): Promise<unknown>;
  upload(body: FormData): Promise<{ id: string }>;
  ask(id: string, question: string): Promise<CitedAnswer>;
  logout(): Promise<unknown>;
}
export const httpWorkspaceGateway: WorkspaceGateway = {
  load: () => requestJson("/api/workspace"),
  save: (r, data) =>
    requestJson("/api/workspace", {
      kind: r.kind,
      id: r.id,
      revision: r.revision,
      data,
    }),
  create: (kind, data) => requestJson("/api/workspace", { kind, data }),
  remove: (r) =>
    requestJson("/api/workspace", { kind: r.kind, id: r.id, action: "delete" }),
  async upload(body) {
    const r = await fetch("/api/document", { method: "POST", body });
    const data = await r.json();
    if (!r.ok)
      throw new ApiError(data.error || "Document could not be saved", r.status);
    return data;
  },
  ask: (id, question) => requestJson("/api/ai", { id, question }),
  logout: () => requestJson("/api/auth", { action: "logout" }),
};
