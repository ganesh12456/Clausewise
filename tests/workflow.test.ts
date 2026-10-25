import assert from "node:assert/strict";
import {
  RecordService,
  RecordError,
  type WorkspaceRepository,
  type StoredRecord,
  type Activity,
  type RecordPolicy,
} from "../lib/server/application/records.ts";
import {
  agreementStage,
  nextAction,
  deadlineState,
  type Agreement,
} from "../lib/domain/workspace.ts";
import { calendarText } from "../lib/client/exports.ts";
// Substitute an in-memory port to test application decisions independently of SQL.
class MemoryRepository implements WorkspaceRepository {
  records: StoredRecord[] = [];
  events: Activity[] = [];
  async list(owner: string) {
    return this.records.filter((r) => r.owner === owner);
  }
  async listEvents(owner: string) {
    return this.events.filter((e) => e.owner === owner);
  }
  async findOwned(id: string, owner: string, kind: StoredRecord["kind"]) {
    return (
      this.records.find(
        (r) => r.id === id && r.owner === owner && r.kind === kind,
      ) || null
    );
  }
  async insert(r: StoredRecord) {
    this.records.push(r);
  }
  async update(r: StoredRecord) {
    this.records = this.records.map((old) => (old.id === r.id ? r : old));
  }
  async remove(id: string, owner: string) {
    this.records = this.records.filter(
      (r) => !(r.id === id && r.owner === owner),
    );
  }
  async append(e: Activity) {
    this.events.push(e);
  }
}
const repo = new MemoryRepository(),
  service = new RecordService(repo);
await assert.rejects(service.save("owner", null), { code: "invalid" });
await assert.rejects(service.save("owner", { kind: "unknown" }), {
  code: "invalid",
});
const created = await service.save("owner", {
  kind: "policy",
  data: {
    name: "Supplier terms",
    published: false,
    rules: [
      {
        name: "Renewal notice",
        phrase: "automatically renew",
        mode: "prohibited",
        severity: "High",
      },
    ],
  },
});
assert("id" in created);
const original = (await service.load("owner")).records[0];
assert.equal((await service.load("other")).records.length, 0);
await assert.rejects(
  service.save("other", {
    kind: "policy",
    id: original.id,
    data: original.data,
    revision: 1,
  }),
  { code: "not_found" },
);
await service.save("owner", {
  kind: "policy",
  id: original.id,
  data: { ...original.data, name: "Updated supplier terms" },
  revision: 1,
});
assert.equal(repo.records[0].revision, 2);
await assert.rejects(
  service.save("owner", {
    kind: "policy",
    id: original.id,
    data: original.data,
    revision: 1,
  }),
  { code: "conflict" },
);
assert.equal(repo.events.length, 2);
// Extend the policy registry without altering the record service or SQL adapter.
const custom: RecordPolicy = {
  kind: "policy",
  async prepare(data) {
    return { data: { ...data, extension: "accepted" }, parent: null };
  },
};
await new RecordService(repo, [custom]).save("owner", {
  kind: "policy",
  data: { name: "An alternate standard" },
});
assert.equal(repo.records[1].data.extension, "accepted");
const agreement: Agreement = {
  id: "agreement",
  kind: "contract",
  revision: 1,
  created: "2026-01-01T00:00:00Z",
  data: {
    name: "Agreement",
    filename: "agreement.txt",
    text: "Source",
    sha256: "hash",
    pages: [{ page: 1, text: "Source" }],
    coverage: "Text",
    findings: [],
    status: "Ready",
  },
};
assert.equal(agreementStage(agreement), "Awaiting checks");
assert.equal(nextAction(agreement), "Check against company standards");
agreement.data.reviewedAt = "2026-01-01";
assert.equal(agreementStage(agreement), "Review recorded");
agreement.data.findings = [
  {
    id: "finding",
    ruleId: "rule",
    title: "Renewal",
    severity: "High",
    quote: "Source",
    offset: 0,
    reason: "Review",
    suggestion: "Proposed",
    status: "Open",
  },
];
assert.equal(agreementStage(agreement), "Decision required");
assert.equal(deadlineState("2026-01-01", false, "2026-01-02"), "Overdue");
assert.equal(
  deadlineState("2026-02-01", false, "2026-01-02"),
  "Due within 30 days",
);
assert.equal(deadlineState("2026-02-02", false, "2026-01-02"), "Upcoming");
assert.equal(deadlineState("2026-01-01", true, "2026-01-02"), "Complete");
const calendar = calendarText(
  {
    id: "commitment",
    kind: "obligation",
    revision: 1,
    created: "2026-01-01",
    data: {
      name: "Renewal, notice\nconfirmed",
      date: "2026-02-01",
      contractId: "agreement",
      owner: "Procurement",
      evidence: "Clause; 12",
      done: false,
    },
  },
  new Date("2026-01-02T00:00:00Z"),
);
assert(calendar.includes("SUMMARY:Renewal\\, notice\\nconfirmed"));
assert(calendar.includes("TRIGGER:-P7D"));
assert(!calendar.includes("SUMMARY:Renewal, notice\nconfirmed"));
console.log(
  "Application port substitution, policy extension, ownership, workflow stages, deadline boundaries and calendar escaping passed",
);
