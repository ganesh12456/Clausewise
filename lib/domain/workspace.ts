import type { Rule } from "../engine.ts";
export type View =
  | "desk"
  | "agreements"
  | "standards"
  | "compare"
  | "commitments"
  | "history"
  | "connections";
export type Decision = "Open" | "Approved" | "Rejected";
export type Finding = {
  id: string;
  ruleId: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  quote: string;
  offset: number | null;
  reason: string;
  suggestion: string;
  status: Decision;
  decisionAt?: string;
  policy?: Rule;
};
export type AgreementData = {
  name: string;
  filename: string;
  text: string;
  pages: { page: number; text: string }[];
  sha256: string;
  status: string;
  findings: Finding[];
  coverage: string;
  notes?: string;
  policyName?: string;
  policyRevision?: number;
  reviewedAt?: string;
};
export type StandardData = { name: string; published: boolean; rules: Rule[] };
export type CommitmentData = {
  name: string;
  contractId: string;
  date: string;
  owner: string;
  evidence: string;
  done: boolean;
};
export type RecordKind = "contract" | "policy" | "obligation";
export type Entity<K extends RecordKind, T> = {
  id: string;
  kind: K;
  data: T;
  revision: number;
  created: string;
};
export type Agreement = Entity<"contract", AgreementData>;
export type Standard = Entity<"policy", StandardData>;
export type Commitment = Entity<"obligation", CommitmentData>;
export type WorkspaceRecord = Agreement | Standard | Commitment;
export type AuditEvent = {
  id: string;
  action: string;
  subject: string;
  created: string;
};
export type User = { email: string; userId: string; displayName: string };
export type WorkspaceSnapshot = {
  records: WorkspaceRecord[];
  events: AuditEvent[];
  ai: boolean;
  user: User | null;
};
export type WorkspaceBootstrap = {
  snapshot: WorkspaceSnapshot;
  requiresSignIn: boolean;
  error?: string;
};
export type CitedAnswer = { answer: string; quote: string; limited: boolean };
export type AgreementStage =
  | "Awaiting checks"
  | "Decision required"
  | "Review recorded";
export function agreementStage(agreement: Agreement): AgreementStage {
  if (!agreement.data.reviewedAt) return "Awaiting checks";
  return agreement.data.findings.some((f) => f.status === "Open")
    ? "Decision required"
    : "Review recorded";
}
export function nextAction(agreement: Agreement) {
  const stage = agreementStage(agreement);
  return stage === "Awaiting checks"
    ? "Check against company standards"
    : stage === "Decision required"
      ? "Resolve outstanding clause decisions"
      : "Confirm commitments and deadlines";
}
export function deadlineState(
  date: string,
  done: boolean,
  today = new Date().toISOString().slice(0, 10),
) {
  if (done) return "Complete";
  if (date < today) return "Overdue";
  const days =
    (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
    86400000;
  return days <= 30 ? "Due within 30 days" : "Upcoming";
}
export function businessDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? value + "T00:00:00Z" : value));
}
