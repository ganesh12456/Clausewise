import { validDate } from "../../engine.ts";
import type { RecordKind } from "../../domain/workspace.ts";
export type RecordData = { name: string; [key: string]: unknown };
export type StoredRecord = {
  id: string;
  owner: string;
  kind: RecordKind;
  data: RecordData;
  revision: number;
  created: string;
};
export type Activity = {
  id: string;
  owner: string;
  action: string;
  subject: string;
  created: string;
};
export interface RecordReader {
  list(owner: string): Promise<StoredRecord[]>;
  findOwned(
    id: string,
    owner: string,
    kind: RecordKind,
    lock?: boolean,
  ): Promise<StoredRecord | null>;
}
export interface RecordWriter {
  insert(record: StoredRecord, parent: string | null): Promise<void>;
  update(record: StoredRecord, parent: string | null): Promise<void>;
  remove(id: string, owner: string): Promise<void>;
}
export interface AuditTrail {
  listEvents(owner: string): Promise<Activity[]>;
  append(event: Activity): Promise<void>;
}
export interface WorkspaceRepository
  extends RecordReader,
    RecordWriter,
    AuditTrail {}
export class RecordError extends Error {
  code: "invalid" | "not_found" | "conflict";
  constructor(
    message: string,
    code: "invalid" | "not_found" | "conflict" = "invalid",
  ) {
    super(message);
    this.code = code;
  }
}
interface ValidationContext {
  reader: RecordReader;
  owner: string;
  previous: StoredRecord | null;
}
export interface RecordPolicy {
  kind: RecordKind;
  prepare(
    data: RecordData,
    context: ValidationContext,
  ): Promise<{ data: RecordData; parent: string | null }>;
}
const contractPolicy: RecordPolicy = {
  kind: "contract",
  async prepare(data, { previous }) {
    if (!previous) throw new RecordError("Use document upload");
    const updated = { ...data };
    for (const field of ["text", "pages", "filename", "sha256", "coverage"])
      updated[field] = previous.data[field];
    return { data: updated, parent: null };
  },
};
const companyStandardPolicy: RecordPolicy = {
  kind: "policy",
  async prepare(data) {
    const rules = data.rules;
    if (
      !Array.isArray(rules) ||
      !rules.length ||
      rules.length > 100 ||
      rules.some(
        (r) =>
          !r ||
          typeof r.phrase !== "string" ||
          !r.phrase.trim() ||
          typeof r.name !== "string" ||
          !r.name.trim() ||
          !["required", "prohibited"].includes(r.mode) ||
          !["High", "Medium", "Low"].includes(r.severity),
      )
    )
      throw new RecordError("Policy rules are invalid");
    return { data, parent: null };
  },
};
const commitmentPolicy: RecordPolicy = {
  kind: "obligation",
  async prepare(data, { reader, owner }) {
    if (typeof data.date !== "string" || !validDate(data.date))
      throw new RecordError("A valid confirmed date is required");
    if (
      typeof data.contractId !== "string" ||
      !(await reader.findOwned(data.contractId, owner, "contract"))
    )
      throw new RecordError("Contract not found", "not_found");
    return { data, parent: data.contractId };
  },
};
export const recordPolicies: readonly RecordPolicy[] = [
  contractPolicy,
  companyStandardPolicy,
  commitmentPolicy,
];
export class RecordService {
  private policies: Map<RecordKind, RecordPolicy>;
  constructor(
    privateRepository: WorkspaceRepository,
    policies: readonly RecordPolicy[] = recordPolicies,
  ) {
    this.repository = privateRepository;
    this.policies = new Map(policies.map((policy) => [policy.kind, policy]));
  }
  private repository: WorkspaceRepository;
  async load(owner: string) {
    const [records, events] = await Promise.all([
      this.repository.list(owner),
      this.repository.listEvents(owner),
    ]);
    return { records, events };
  }
  async save(owner: string, input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new RecordError("Invalid record");
    const command = input as {
      kind: RecordKind;
      id?: unknown;
      action?: unknown;
      data?: unknown;
      revision?: unknown;
    };
    const policy = this.policies.get(command.kind);
    if (!policy) throw new RecordError("Unsupported record");
    if (command.id !== undefined && typeof command.id !== "string")
      throw new RecordError("Invalid record");
    const previous = command.id
      ? await this.repository.findOwned(command.id, owner, command.kind, true)
      : null;
    if (command.id && !previous)
      throw new RecordError("Not found", "not_found");
    if (command.action === "delete") {
      if (!previous) throw new RecordError("Not found", "not_found");
      await this.repository.remove(previous.id, owner);
      await this.audit(owner, "Deleted " + command.kind, previous.data.name);
      return { ok: true };
    }
    if (
      !command.data ||
      typeof command.data !== "object" ||
      Array.isArray(command.data)
    )
      throw new RecordError("A name is required");
    const data = command.data as RecordData;
    if (
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.length > 250
    )
      throw new RecordError("A name is required");
    if (previous && previous.revision !== command.revision)
      throw new RecordError(
        "This record changed. Refresh before saving.",
        "conflict",
      );
    const prepared = await policy.prepare(
      { ...data },
      { reader: this.repository, owner, previous },
    );
    const record: StoredRecord = {
      id: previous?.id || crypto.randomUUID(),
      owner,
      kind: command.kind,
      data: prepared.data,
      revision: previous ? previous.revision + 1 : 1,
      created: previous?.created || new Date().toISOString(),
    };
    if (previous) await this.repository.update(record, prepared.parent);
    else await this.repository.insert(record, prepared.parent);
    await this.audit(
      owner,
      (previous ? "Updated " : "Created ") + command.kind,
      prepared.data.name,
    );
    return { id: record.id };
  }
  private async audit(owner: string, action: string, subject: string) {
    await this.repository.append({
      id: crypto.randomUUID(),
      owner,
      action,
      subject,
      created: new Date().toISOString(),
    });
  }
}
