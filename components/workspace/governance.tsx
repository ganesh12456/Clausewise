"use client";
import { useDeferredValue, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Columns2,
  Download,
  FileText,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { compare } from "../../lib/engine";
import { calendarText, download } from "../../lib/client/exports";
import {
  businessDate,
  deadlineState,
  type Agreement,
  type AuditEvent,
  type Commitment,
  type Standard,
} from "../../lib/domain/workspace";
import AiSettings from "../ai-settings";
import { Badge, EmptyState, PageHeading, SectionHeading } from "./primitives";
export function CompanyStandards({
  standards,
  onCreate,
  onEdit,
  onPublish,
  disabled,
}: {
  standards: Standard[];
  onCreate: () => void;
  onEdit: (s: Standard) => void;
  onPublish: (s: Standard) => void;
  disabled: boolean;
}) {
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEGOTIATING POSITION"
        title="Standards that mean business."
        description="Define the terms you expect, the wording you avoid and the alternatives you prefer."
        action={
          <button className="primary" onClick={onCreate} disabled={disabled}>
            <Plus size={17} />
            Create company standard
          </button>
        }
      />
      <div className="standardIntro">
        <BookOpen size={25} />
        <p>
          <strong>A consistent starting point for every review.</strong> Publish
          a standard to make it available for agreement checks. Each review
          keeps a copy of the rules and version it used.
        </p>
        <span className="badge neutral">
          {standards.filter((s) => s.data.published).length} published
        </span>
      </div>
      <div className="standardsGrid">
        {standards.map((s) => (
          <article className="panel standardCard" key={s.id}>
            <div className="standardCardTop">
              <span className="standardSymbol">
                <BookOpen size={21} />
              </span>
              <Badge tone={s.data.published ? "green" : "neutral"}>
                {s.data.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <span className="eyebrow">
              COMPANY STANDARD / VERSION {s.revision}
            </span>
            <h2>{s.data.name}</h2>
            <p>
              {s.data.rules.length}{" "}
              {s.data.rules.length === 1 ? "rule" : "rules"} · Explicit phrase
              checks
            </p>
            <div className="standardRules">
              {s.data.rules.map((r, i) => (
                <div key={r.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>
                      {r.mode === "required"
                        ? "Expected wording"
                        : "Wording to review"}{" "}
                      · {r.severity} priority
                    </small>
                    <q>{r.phrase}</q>
                  </div>
                </div>
              ))}
            </div>
            <div className="standardActions">
              <button
                className="secondary"
                disabled={disabled}
                onClick={() => onEdit(s)}
              >
                Edit standard
              </button>
              <button
                className="textLink"
                disabled={disabled}
                onClick={() => onPublish(s)}
              >
                {s.data.published ? "Move to draft" : "Publish for review"}
                <ArrowRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!standards.length && (
        <section className="panel">
          <EmptyState
            title="Make your negotiating position explicit."
            description="Start with a required term, a phrase that needs attention, and preferred replacement wording. Publish when the standard is ready for use."
            action={
              <button
                className="primary"
                disabled={disabled}
                onClick={onCreate}
              >
                <Plus size={16} />
                Create your first standard
              </button>
            }
          />
        </section>
      )}
      <div className="editorialNote">
        <span>CONSISTENCY, WITH CONTEXT</span>
        <p>
          Phrase checks identify explicit wording. A reviewer still considers
          equivalent language, commercial context and the quality of the source.
        </p>
      </div>
    </>
  );
}
export function VersionComparison({
  agreements,
  onUpload,
  open,
}: {
  agreements: Agreement[];
  onUpload: () => void;
  open: (id: string) => void;
}) {
  const [base, setBase] = useState(""),
    [revision, setRevision] = useState("");
  const a = agreements.find((r) => r.id === base),
    b = agreements.find((r) => r.id === revision);
  const valid = a && b && a.id !== b.id;
  const result = valid
    ? { base: a, revised: b, ...compare(a.data.text, b.data.text) }
    : null;
  const diff = result;
  return (
    <>
      <PageHeading
        eyebrow="THE NEGOTIATION RECORD"
        title="See what changed. Before you agree."
        description="Compare two uploaded versions and consider the changes in their business context."
      />
      <section className="panel comparisonSetup">
        <div className="comparisonIcon">
          <Columns2 size={25} />
        </div>
        <label className="fieldLabel">
          Original version
          <select value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Choose the starting agreement</option>
            {agreements.map((r) => (
              <option value={r.id} key={r.id}>
                {r.data.name}
              </option>
            ))}
          </select>
        </label>
        <span className="comparisonArrow">
          <ArrowRight size={21} />
        </span>
        <label className="fieldLabel">
          Revised version
          <select
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
          >
            <option value="">Choose the revised agreement</option>
            {agreements.map((r) => (
              <option value={r.id} key={r.id}>
                {r.data.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      {base && revision && base === revision && (
        <div className="notice" role="status">
          Choose two different agreements to compare their wording.
        </div>
      )}
      {diff ? (
        <>
          <div className="comparisonSummary">
            <span>
              <strong>{diff.removed.length}</strong> previous paragraphs changed
              or removed
            </span>
            <span>
              <strong>{diff.added.length}</strong> paragraphs added or changed
            </span>
            <span>
              <strong>{diff.unchanged}</strong> paragraphs unchanged
            </span>
          </div>
          <div className="comparisonColumns">
            {[
              {
                name: diff.base.data.name,
                items: diff.removed,
                label: "PREVIOUS WORDING",
                tone: "removed",
                id: diff.base.id,
              },
              {
                name: diff.revised.data.name,
                items: diff.added,
                label: "REVISED WORDING",
                tone: "added",
                id: diff.revised.id,
              },
            ].map((side) => (
              <section className="panel diffPanel" key={side.label}>
                <div className="diffHeading">
                  <div>
                    <span className="eyebrow">{side.label}</span>
                    <h2>{side.name}</h2>
                  </div>
                  <button className="textLink" onClick={() => open(side.id)}>
                    Open review
                    <ArrowRight size={14} />
                  </button>
                </div>
                {side.items.map((text, i) => (
                  <div className={"diffParagraph " + side.tone} key={i}>
                    <span>{side.tone === "added" ? "+" : "−"}</span>
                    <p>{text}</p>
                  </div>
                ))}
                {!side.items.length && (
                  <EmptyState
                    compact
                    title="No paragraph changes on this side."
                    description="The extracted paragraphs match the selected version."
                  />
                )}
              </section>
            ))}
          </div>
          <p className="methodNote">
            Comparison uses extracted paragraphs. Formatting, reordered
            duplicates and legal meaning need a separate review.
          </p>
        </>
      ) : (
        <section className="panel">
          <EmptyState
            title="Two versions. A clearer conversation."
            description={
              agreements.length < 2
                ? "Add the original and revised agreements to compare the actual wording."
                : "Choose the original and revised versions above to see additions and removals side by side."
            }
            action={
              agreements.length < 2 ? (
                <button className="primary" onClick={onUpload}>
                  <Plus size={16} />
                  Add agreement versions
                </button>
              ) : undefined
            }
          />
        </section>
      )}
    </>
  );
}
export function Commitments({
  commitments,
  agreements,
  onCreate,
  onToggle,
  disabled,
}: {
  commitments: Commitment[];
  agreements: Agreement[];
  onCreate: () => void;
  onToggle: (c: Commitment) => void;
  disabled: boolean;
}) {
  const [filter, setFilter] = useState("Open");
  const rows = commitments
    .filter((c) => filter === "All" || (filter === "Complete") === c.data.done)
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  return (
    <>
      <PageHeading
        eyebrow="THE AGREEMENT IN ACTION"
        title="A commitment deserves a clear owner."
        description="Turn confirmed contract obligations into accountable actions and calendar reminders."
        action={
          <button
            className="primary"
            onClick={onCreate}
            disabled={disabled || !agreements.length}
          >
            <Plus size={17} />
            Record commitment
          </button>
        }
      />
      <div className="commitmentBanner">
        <CalendarDays size={23} />
        <div>
          <strong>The right action. By the right date.</strong>
          <p>
            Verify each deadline against the contract. Calendar exports include
            a reminder seven days before the confirmed date.
          </p>
        </div>
        <span>CONFIRM → ASSIGN → TRACK</span>
      </div>
      <div className="registerToolbar">
        <div
          className="filterTabs"
          role="group"
          aria-label="Filter commitments"
        >
          {["Open", "Complete", "All"].map((s) => (
            <button
              key={s}
              aria-pressed={filter === s}
              className={filter === s ? "active" : ""}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="methodNote">
          Calendar reminders available · Email delivery not connected
        </span>
      </div>
      <section className="panel commitmentRegister">
        {rows.map((c) => {
          const state = deadlineState(c.data.date, c.data.done);
          return (
            <article className="commitmentRow" key={c.id}>
              <button
                className={
                  "completionButton " + (c.data.done ? "complete" : "")
                }
                aria-label={
                  (c.data.done ? "Reopen " : "Mark complete: ") + c.data.name
                }
                aria-pressed={c.data.done}
                disabled={disabled}
                onClick={() => onToggle(c)}
              >
                {c.data.done ? <Check size={16} /> : <span />}
              </button>
              <div className="commitmentTitle">
                <h2>{c.data.name}</h2>
                <p>
                  {agreements.find((a) => a.id === c.data.contractId)?.data
                    .name || "Linked agreement"}
                </p>
                <details>
                  <summary>Supporting clause</summary>
                  <blockquote>{c.data.evidence}</blockquote>
                </details>
              </div>
              <div className="commitmentOwner">
                <span>ACCOUNTABLE OWNER</span>
                <strong>{c.data.owner || "Not assigned"}</strong>
              </div>
              <div className="commitmentDue">
                <time dateTime={c.data.date}>{businessDate(c.data.date)}</time>
                <Badge
                  tone={
                    state === "Overdue"
                      ? "red"
                      : state === "Due within 30 days"
                        ? "amber"
                        : c.data.done
                          ? "green"
                          : "neutral"
                  }
                >
                  {state === "Due within 30 days" ? "Due soon" : state}
                </Badge>
              </div>
              <button
                className="iconButton"
                title="Download calendar reminder"
                aria-label={"Download calendar reminder: " + c.data.name}
                onClick={() =>
                  download("commitment.ics", calendarText(c), "text/calendar")
                }
              >
                <Download size={17} />
              </button>
            </article>
          );
        })}
        {!rows.length && (
          <EmptyState
            title={
              commitments.length
                ? "No commitments in this view."
                : "Keep the agreement working for you."
            }
            description={
              commitments.length
                ? "Switch to another view to see your confirmed actions."
                : "Record a renewal notice, payment, delivery or other obligation. Confirm its date against the source and assign an owner."
            }
            action={
              !commitments.length && agreements.length > 0 ? (
                <button
                  className="primary"
                  disabled={disabled}
                  onClick={onCreate}
                >
                  Record your first commitment
                  <Plus size={16} />
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </>
  );
}
export function DecisionHistory({ events }: { events: AuditEvent[] }) {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.toLowerCase());
  const rows = events.filter((e) =>
    (e.action + " " + e.subject).toLowerCase().includes(search),
  );
  return (
    <>
      <PageHeading
        eyebrow="REVIEW ACCOUNTABILITY"
        title="A record you can return to."
        description="Follow the uploads, standard changes and review updates saved in your workspace."
      />
      <div className="historyToolbar">
        <span className="eyebrow">MOST RECENT 60 EVENTS</span>
        <label className="searchField">
          <Search size={16} />
          <span className="srOnly">Search decision history</span>
          <input
            placeholder="Find an activity…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <section className="panel historyPanel">
        {rows.map((e) => (
          <article className="historyRow" key={e.id}>
            <span className="historyMarker">
              <FileText size={16} />
            </span>
            <div>
              <h2>{e.action}</h2>
              <p>{e.subject}</p>
            </div>
            <time dateTime={e.created}>
              {businessDate(e.created)}
              <small>
                {new Date(e.created).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </time>
            <Badge>Recorded</Badge>
          </article>
        ))}
        {!rows.length && (
          <EmptyState
            title={
              events.length
                ? "No matching activity."
                : "Your process leaves a clear record."
            }
            description={
              events.length
                ? "Try a different agreement name or activity."
                : "Uploads, changes to company standards and agreement review updates will appear here as you work."
            }
          />
        )}
      </section>
    </>
  );
}
export function Connections({
  connected,
  userEmail,
  onAiChange,
}: {
  connected: boolean;
  userEmail: string | undefined;
  onAiChange: (v: boolean) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE CONNECTIONS"
        title="Useful intelligence. Under your control."
        description="Connect an AI provider, understand processing coverage, and keep access private."
      />
      <div className="connectionsLayout">
        <div>
          <AiSettings onChange={onAiChange} />
          <section className="panel capabilities">
            <SectionHeading title="What your workspace can do" />
            {[
              ["Agreement files", "Private PostgreSQL storage"],
              [
                "Company standards",
                "Published phrase checks with version snapshots",
              ],
              [
                "Renewal reminders",
                "Calendar export with a seven-day reminder",
              ],
              ["Scanned agreements", "OCR is not connected"],
              [
                "Finding a clause",
                "Keyword search; semantic search is not connected",
              ],
            ].map(([name, value]) => (
              <div className="settingRow" key={name}>
                <strong>{name}</strong>
                <span>{value}</span>
              </div>
            ))}
          </section>
        </div>
        <aside className="connectionAside">
          <ShieldCheck size={26} />
          <div className="eyebrow">PRIVATE BY DESIGN</div>
          <h2>
            Your source.
            <br />
            Your standards.
            <br />
            <em>Your decision.</em>
          </h2>
          <p>
            AI answers support a reviewer. Every suggested change remains yours
            to consider.
          </p>
          <dl>
            <div>
              <dt>Workspace access</dt>
              <dd>{userEmail || "Sign-in required"}</dd>
            </div>
            <div>
              <dt>AI connection</dt>
              <dd>{connected ? "API key saved" : "Not connected"}</dd>
            </div>
            <div>
              <dt>Review ownership</dt>
              <dd>Single workspace owner</dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}
