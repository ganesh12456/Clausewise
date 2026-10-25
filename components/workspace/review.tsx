"use client";
import { useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileText,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { review } from "../../lib/engine";
import { exportReview } from "../../lib/client/exports";
import {
  agreementStage,
  type Agreement,
  type AgreementData,
  type Standard,
  type Commitment,
  type Finding,
  type Decision,
  type CitedAnswer,
} from "../../lib/domain/workspace";
import { Badge, EmptyState, PageHeading } from "./primitives";
function FindingCard({
  finding,
  busy,
  onUpdate,
  onEvidence,
}: {
  finding: Finding;
  busy: boolean;
  onUpdate: (status: Decision, suggestion: string) => void;
  onEvidence: (quote: string) => void;
}) {
  const [draft, setDraft] = useState(finding.suggestion);
  useEffect(() => setDraft(finding.suggestion), [finding.suggestion]);
  return (
    <article className="findingCard">
      <div className="findingTop">
        <Badge
          tone={
            finding.severity === "High"
              ? "red"
              : finding.severity === "Medium"
                ? "amber"
                : "neutral"
          }
        >
          {finding.severity} priority
        </Badge>
        <span className={"decisionLabel " + finding.status.toLowerCase()}>
          {finding.status === "Open" ? "Decision needed" : finding.status}
        </span>
      </div>
      <h3>{finding.title}</h3>
      <p>{finding.reason}</p>
      {finding.quote ? (
        <button
          className="evidenceQuote"
          onClick={() => onEvidence(finding.quote)}
        >
          <span>SOURCE EXCERPT</span>
          <q>{finding.quote}</q>
          <small>
            Locate in source <ArrowRight size={12} />
          </small>
        </button>
      ) : (
        <div className="missingEvidence">
          Required wording was not found. Check equivalent wording in the
          original agreement.
        </div>
      )}
      <label className="fieldLabel">
        Proposed wording
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a proposed change for the counterparty…"
          rows={3}
        />
      </label>
      <div className="findingActions">
        <button
          className="primary compact"
          disabled={
            busy ||
            (finding.status === "Approved" && draft === finding.suggestion)
          }
          onClick={() => onUpdate("Approved", draft)}
        >
          <Check size={14} />
          Accept proposal
        </button>
        <button
          className="secondary compact"
          disabled={
            busy ||
            (finding.status === "Rejected" && draft === finding.suggestion)
          }
          onClick={() => onUpdate("Rejected", draft)}
        >
          Decline
        </button>
        {finding.status !== "Open" && (
          <button
            className="textLink"
            disabled={busy}
            onClick={() => onUpdate("Open", draft)}
          >
            Reopen
          </button>
        )}
        {draft !== finding.suggestion && (
          <button
            className="textLink"
            disabled={busy}
            onClick={() => onUpdate("Open", draft)}
          >
            Save draft
          </button>
        )}
      </div>
    </article>
  );
}
export function AgreementReview({
  agreement,
  standards,
  commitments,
  ai,
  busy,
  onSave,
  onDelete,
  onBack,
  onCommitment,
  onStandards,
  onConnections,
  onAsk,
}: {
  agreement: Agreement;
  standards: Standard[];
  commitments: Commitment[];
  ai: boolean;
  busy: boolean;
  onSave: (data: AgreementData) => Promise<unknown>;
  onDelete: () => void;
  onBack: () => void;
  onCommitment: () => void;
  onStandards: () => void;
  onConnections: () => void;
  onAsk: (question: string) => Promise<CitedAnswer | undefined>;
}) {
  const [standardId, setStandardId] = useState(""),
    [highlight, setHighlight] = useState(""),
    [mobilePane, setMobilePane] = useState<"source" | "review">("review"),
    [filter, setFilter] = useState<"all" | "open">("all"),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<CitedAnswer | null>(null);
  const source = useRef<HTMLDivElement>(null);
  const published = standards.filter((s) => s.data.published);
  const d = agreement.data;
  const open = d.findings.filter((f) => f.status === "Open");
  const linked = commitments.filter((c) => c.data.contractId === agreement.id);
  const status = agreementStage(agreement);
  const active = standardId || published[0]?.id || "";
  function evidence(quote: string) {
    setHighlight(quote);
    setMobilePane("source");
    setTimeout(
      () =>
        source.current
          ?.querySelector("mark")
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "center",
          }),
      60,
    );
  }
  function updateFinding(id: string, decision: Decision, suggestion: string) {
    return onSave({
      ...d,
      findings: d.findings.map((f) =>
        f.id === id
          ? {
              ...f,
              status: decision,
              suggestion,
              decisionAt: new Date().toISOString(),
            }
          : f,
      ),
    });
  }
  return (
    <>
      <button className="backLink" onClick={onBack}>
        <ArrowLeft size={15} />
        Agreement register
      </button>
      <PageHeading
        eyebrow="AGREEMENT / REVIEW WORKSPACE"
        title={d.name}
        description={d.filename}
        action={
          <div className="buttons">
            <a
              className="secondary"
              href={"/api/document?id=" + encodeURIComponent(agreement.id)}
            >
              <Download size={15} />
              Original
            </a>
            <button className="primary" onClick={() => exportReview(agreement)}>
              Export review <ArrowRight size={15} />
            </button>
          </div>
        }
      />
      <div className="reviewStageBar">
        <Badge
          tone={
            status === "Decision required"
              ? "amber"
              : status === "Review recorded"
                ? "green"
                : "neutral"
          }
        >
          {status}
        </Badge>
        <div>
          <span className="stepComplete">01 Source received</span>
          <i />
          <span className={d.reviewedAt ? "stepComplete" : ""}>
            02 Standards checked
          </span>
          <i />
          <span className={d.reviewedAt && !open.length ? "stepComplete" : ""}>
            03 Decisions recorded
          </span>
          <i />
          <button
            onClick={onCommitment}
            className={linked.length ? "stepComplete" : ""}
          >
            04 Commitments {linked.length > 0 && `(${linked.length})`}
          </button>
        </div>
      </div>
      <section className="reviewControl">
        <div>
          <ShieldCheck size={22} />
          <div>
            <strong>Review against your company standard</strong>
            <p>Explicit phrase checks. A reviewer interprets the context.</p>
          </div>
        </div>
        <div className="reviewControlActions">
          <label>
            <span className="srOnly">Company standard</span>
            <select
              value={active}
              onChange={(e) => setStandardId(e.target.value)}
              disabled={busy || !published.length}
            >
              <option value="">Choose a published standard</option>
              {published.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.data.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={!active || busy}
            onClick={() => {
              const standard = published.find((s) => s.id === active);
              if (!standard) return;
              if (
                d.reviewedAt &&
                !confirm(
                  "Run a fresh review? This replaces the current clause findings and decisions. Export the current review first if you need to retain it.",
                )
              )
                return;
              void onSave({
                ...d,
                findings: review(d.text, standard.data.rules),
                policyName: standard.data.name,
                policyRevision: standard.revision,
                reviewedAt: new Date().toISOString(),
                status: "In review",
              });
            }}
          >
            Run checks <ArrowRight size={15} />
          </button>
        </div>
        {!published.length && (
          <button className="textLink" onClick={onStandards}>
            Create and publish a company standard <ArrowRight size={14} />
          </button>
        )}
      </section>
      <div className="coverageNote">
        <FileText size={15} />
        <p>
          {d.coverage}{" "}
          <a href={"/api/document?id=" + encodeURIComponent(agreement.id)}>
            Verify against the original.
          </a>
        </p>
      </div>
      <div className="mobileReviewTabs" role="group" aria-label="Review pane">
        <button
          aria-pressed={mobilePane === "review"}
          onClick={() => setMobilePane("review")}
        >
          Clause decisions ({d.findings.length})
        </button>
        <button
          aria-pressed={mobilePane === "source"}
          onClick={() => setMobilePane("source")}
        >
          Source agreement
        </button>
      </div>
      <div className="reviewColumns">
        <section
          className={
            "panel sourcePanel " +
            (mobilePane === "source" ? "mobileSelected" : "")
          }
        >
          <div className="sourceHeading">
            <div>
              <span className="eyebrow">THE EVIDENCE</span>
              <h2>Source agreement</h2>
            </div>
            <Badge>Extracted text</Badge>
          </div>
          <div className="sourceDocument" ref={source}>
            <div className="sourceDocumentMasthead">
              <span>CLAUSEWISE / SOURCE COPY</span>
              <FileText size={18} />
            </div>
            <h3>{d.name}</h3>
            {d.pages.map((page, i) => (
              <section key={i}>
                <span className="sourceSection">
                  EXTRACTED SECTION {page.page}
                </span>
                <p>
                  {highlight && page.text.includes(highlight) ? (
                    <>
                      {page.text.slice(0, page.text.indexOf(highlight))}
                      <mark>{highlight}</mark>
                      {page.text.slice(
                        page.text.indexOf(highlight) + highlight.length,
                      )}
                    </>
                  ) : (
                    page.text
                  )}
                </p>
              </section>
            ))}
          </div>
        </section>
        <div
          className={
            "decisionPanel " + (mobilePane === "review" ? "mobileSelected" : "")
          }
        >
          <section className="panel">
            <div className="decisionHeading">
              <div>
                <span className="eyebrow">THE DECISIONS</span>
                <h2>Terms requiring consideration</h2>
              </div>
              <span className="bigCount">
                {open.length.toString().padStart(2, "0")}
              </span>
            </div>
            {d.policyName && (
              <div className="appliedStandard">
                <span>{d.policyName}</span>
                <small>Version {d.policyRevision}</small>
              </div>
            )}
            {d.findings.length > 0 && (
              <div className="findingFilters">
                <button
                  aria-pressed={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  All clauses ({d.findings.length})
                </button>
                <button
                  aria-pressed={filter === "open"}
                  onClick={() => setFilter("open")}
                >
                  Awaiting decision ({open.length})
                </button>
              </div>
            )}
            {(filter === "open" ? open : d.findings).map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                busy={busy}
                onUpdate={(status, suggestion) =>
                  void updateFinding(f.id, status, suggestion)
                }
                onEvidence={evidence}
              />
            ))}
            {!d.findings.length && (
              <EmptyState
                compact
                title={
                  d.reviewedAt
                    ? "No phrase exceptions found."
                    : "Your review starts with a standard."
                }
                description={
                  d.reviewedAt
                    ? "Read the agreement in context. A phrase check does not establish legal compliance."
                    : "Choose a published company standard above to identify wording that needs your consideration."
                }
              />
            )}{" "}
            {filter === "open" && d.findings.length > 0 && !open.length && (
              <EmptyState
                compact
                title="All clause decisions are recorded."
                description="Confirm the obligations that follow, then export the review for your business decision."
                action={
                  <button className="secondary" onClick={onCommitment}>
                    Confirm a commitment
                    <Plus size={14} />
                  </button>
                }
              />
            )}
          </section>
          <details className="panel questionPanel">
            <summary>
              <MessageSquareText size={18} />
              <div>
                <strong>Ask the agreement</strong>
                <span>Find a supporting clause in your source.</span>
              </div>
              <ChevronDown size={16} />
            </summary>
            <div className="questionBody">
              {!ai ? (
                <div className="connectionPrompt">
                  <p>Connect Gemini to ask questions with source citations.</p>
                  <button className="textLink" onClick={onConnections}>
                    Set up AI connection <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <label className="fieldLabel">
                    Your contract question
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder="What notice is required to end this agreement?"
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={!question.trim() || busy}
                    onClick={async () => {
                      const result = await onAsk(question);
                      if (result) setAnswer(result);
                    }}
                  >
                    Find supporting evidence
                    <ArrowRight size={15} />
                  </button>
                </>
              )}
              {answer && (
                <div className="citedAnswer">
                  <p>{answer.answer}</p>
                  {answer.quote && (
                    <button
                      className="evidenceQuote"
                      onClick={() => evidence(answer.quote)}
                    >
                      <span>SUPPORTING SOURCE</span>
                      <q>{answer.quote}</q>
                      <small>
                        Locate in source
                        <ArrowRight size={12} />
                      </small>
                    </button>
                  )}
                  {answer.limited && (
                    <small>
                      Only the first 150,000 characters were considered.
                    </small>
                  )}
                </div>
              )}
            </div>
          </details>
          <div className="reviewNextStep">
            <span>AFTER THE REVIEW</span>
            <h3>Make the next action clear.</h3>
            <p>
              Confirm who owns the obligation, what needs to happen and when it
              is due.
            </p>
            <button className="textLink" onClick={onCommitment}>
              Record a commitment <ArrowRight size={15} />
            </button>
          </div>
          <button
            className="deleteAgreement"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={14} />
            Delete agreement and related commitments
          </button>
        </div>
      </div>
    </>
  );
}
