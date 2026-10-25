"use client";
import { useDeferredValue, useState } from "react";
import { ArrowUpRight, FileText, Plus, Search } from "lucide-react";
import {
  agreementStage,
  businessDate,
  type Agreement,
  type AgreementStage,
} from "../../lib/domain/workspace";
import { Badge, EmptyState, PageHeading } from "./primitives";
export function AgreementLibrary({
  agreements,
  open,
  onUpload,
  disabled,
}: {
  agreements: Agreement[];
  open: (id: string) => void;
  onUpload: () => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState(""),
    [stage, setStage] = useState<AgreementStage | "All">("All");
  const deferred = useDeferredValue(query.toLowerCase());
  const filtered = agreements.filter(
    (a) =>
      (a.data.name + " " + a.data.text).toLowerCase().includes(deferred) &&
      (stage === "All" || agreementStage(a) === stage),
  );
  return (
    <>
      <PageHeading
        eyebrow="THE AGREEMENT REGISTER"
        title="Every agreement. In perspective."
        description="One source of truth for your terms, review decisions and next steps."
        action={
          <button className="primary" onClick={onUpload} disabled={disabled}>
            <Plus size={17} />
            Add agreement
          </button>
        }
      />
      <div className="registerToolbar">
        <div
          className="filterTabs"
          role="group"
          aria-label="Filter agreements by review stage"
        >
          {(
            [
              "All",
              "Awaiting checks",
              "Decision required",
              "Review recorded",
            ] as const
          ).map((s) => (
            <button
              aria-pressed={stage === s}
              className={stage === s ? "active" : ""}
              key={s}
              onClick={() => setStage(s)}
            >
              {s}
              <span>
                {
                  agreements.filter(
                    (a) => s === "All" || agreementStage(a) === s,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <label className="searchField">
          <Search size={16} />
          <span className="srOnly">Search agreements and source text</span>
          <input
            placeholder="Find an agreement…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <section className="panel agreementRegister">
        <div className="registerColumns" aria-hidden="true">
          <span>AGREEMENT / SOURCE</span>
          <span>REVIEW STAGE</span>
          <span>OPEN DECISIONS</span>
          <span>ADDED</span>
          <span />
        </div>
        {filtered.map((a) => {
          const count = a.data.findings.filter(
            (f) => f.status === "Open",
          ).length;
          return (
            <button
              className="registerRow"
              key={a.id}
              onClick={() => open(a.id)}
            >
              <div className="registerName">
                <span className="documentIcon">
                  <FileText size={21} />
                </span>
                <div>
                  <strong>{a.data.name}</strong>
                  <small>
                    {a.data.filename.split(".").pop()?.toUpperCase()} ·{" "}
                    {a.data.policyName || "Company standard not applied"}
                  </small>
                </div>
              </div>
              <Badge
                tone={
                  agreementStage(a) === "Decision required"
                    ? "amber"
                    : agreementStage(a) === "Review recorded"
                      ? "green"
                      : "neutral"
                }
              >
                {agreementStage(a)}
              </Badge>
              <span className="decisionCount">
                <strong>{count.toString().padStart(2, "0")}</strong>
                <small className="mobileOnly"> open decisions</small>
              </span>
              <time dateTime={a.created}>{businessDate(a.created)}</time>
              <ArrowUpRight size={18} />
            </button>
          );
        })}
        {!filtered.length && (
          <EmptyState
            title={
              agreements.length
                ? "No agreements match this view."
                : "Start with the agreement itself."
            }
            description={
              agreements.length
                ? "Try another stage or a different search."
                : "Upload an original agreement. Check its terms against company standards, record decisions, and confirm the next action."
            }
            action={
              agreements.length ? (
                <button
                  className="secondary"
                  onClick={() => {
                    setQuery("");
                    setStage("All");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <button
                  className="primary"
                  onClick={onUpload}
                  disabled={disabled}
                >
                  <Plus size={16} />
                  Add your first agreement
                </button>
              )
            }
          />
        )}
      </section>
      <div className="registerNote">
        <span>READING THE REGISTER</span>
        <p>
          “Review recorded” means the current checks and decisions have been
          saved. Final agreement approval remains your business decision.
        </p>
      </div>
    </>
  );
}
