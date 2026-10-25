"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Plus,
  Upload,
} from "lucide-react";
import {
  agreementStage,
  businessDate,
  deadlineState,
  nextAction,
  type Agreement,
  type Commitment,
  type Standard,
  type View,
} from "../../lib/domain/workspace";
import { Badge, EmptyState, SectionHeading, TextLink } from "./primitives";
export function ReviewDesk({
  agreements,
  standards,
  commitments,
  navigate,
  open,
  onUpload,
  disabled,
  privateView = false,
}: {
  agreements: Agreement[];
  standards: Standard[];
  commitments: Commitment[];
  navigate: (v: View) => void;
  open: (id: string) => void;
  onUpload: () => void;
  disabled: boolean;
  privateView?: boolean;
}) {
  const pending = agreements.filter(
    (a) => agreementStage(a) !== "Review recorded",
  );
  const unresolved = agreements
    .flatMap((a) => a.data.findings)
    .filter((f) => f.status === "Open");
  const due = commitments
    .filter(
      (c) =>
        !c.data.done &&
        ["Overdue", "Due within 30 days"].includes(
          deadlineState(c.data.date, c.data.done),
        ),
    )
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const priority = [...pending].sort(
    (a, b) =>
      Number(agreementStage(b) === "Decision required") -
      Number(agreementStage(a) === "Decision required"),
  );
  return (
    <>
      <section className="deskHero">
        <div className="heroCopy">
          <div className="eyebrow">
            <span className="liveDot" />
            THE CONTRACT REVIEW DESK
          </div>
          <h1>
            Better agreements.
            <br />
            <em>Clearer decisions.</em>
          </h1>
          <p>
            Understand the terms. Resolve the exceptions.
            <br className="desktopBreak" /> Keep every business commitment in
            sight.
          </p>
          <div className="heroActions">
            <button className="primary" disabled={disabled} onClick={onUpload}>
              <Plus size={17} />
              Add an agreement
            </button>
            <button className="heroLink" onClick={() => navigate("standards")}>
              Define your standards <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="heroFootnote">
            <span className="tinyRule" />
            Built around your evidence, your policies, your judgment.
          </div>
        </div>
        <div
          className="folio"
          aria-label="Review process: source agreement, company standards, recorded decision"
        >
          <div className="folioSide">THE CONSIDERED AGREEMENT / 01</div>
          <div className="folioCard">
            <div className="folioTop">
              <span className="folioLogo">c.</span>
              <span>REVIEW BRIEF</span>
              <FileText size={18} />
            </div>
            <div className="folioTitle">
              From complex terms
              <br />
              to a clear next step.
            </div>
            <div className="folioLines">
              <i />
              <i />
              <i />
            </div>
            <div className="folioCheck">
              <span>01</span>Understand the agreement
              <Check size={13} />
            </div>
            <div className="folioCheck">
              <span>02</span>Check company standards
              <Check size={13} />
            </div>
            <div className="folioCheck">
              <span>03</span>Record the decision
              <ArrowRight size={13} />
            </div>
            <div className="folioBottom">
              A PROCESS YOU CAN STAND BEHIND<span>↗</span>
            </div>
          </div>
          <div className="folioSeal">
            <span>REVIEW WITH</span>
            <strong>perspective.</strong>
          </div>
        </div>
      </section>
      <section className="businessPulse" aria-label="Workspace priorities">
        {[
          [
            pending.length,
            "Agreements in review",
            "Move each agreement toward a decision",
            "agreements",
          ],
          [
            unresolved.length,
            "Decisions awaiting review",
            "Resolve the terms that need attention",
            "agreements",
          ],
          [
            due.length,
            "Deadlines in the next 30 days",
            "Includes overdue commitments",
            "commitments",
          ],
        ].map(([count, title, detail, view]) => (
          <button key={title} onClick={() => navigate(view as View)}>
            <strong>
              {privateView ? "—" : String(count).padStart(2, "0")}
            </strong>
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </section>
      <div className="deskGrid">
        <section className="panel reviewQueue">
          <SectionHeading
            number="01"
            title="Agreements that need you"
            detail="A clear next action for every agreement."
            action={
              <TextLink onClick={() => navigate("agreements")}>
                All agreements
              </TextLink>
            }
          />
          {priority.length ? (
            <div className="agreementQueue">
              {priority.slice(0, 4).map((a) => (
                <button
                  key={a.id}
                  className="queueRow"
                  onClick={() => open(a.id)}
                >
                  <span className="documentIcon">
                    <FileText size={21} />
                  </span>
                  <div className="queueTitle">
                    <strong>{a.data.name}</strong>
                    <span>{nextAction(a)}</span>
                  </div>
                  <Badge
                    tone={
                      agreementStage(a) === "Decision required"
                        ? "amber"
                        : "neutral"
                    }
                  >
                    {agreementStage(a)}
                  </Badge>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
          ) : agreements.length ? (
            <EmptyState
              title="Every current review has a recorded decision."
              description="Revisit an agreement or check the commitments that follow. Recorded decisions do not establish legal compliance."
              action={
                <button
                  className="secondary"
                  onClick={() => navigate("agreements")}
                >
                  Open agreements
                  <ArrowRight size={15} />
                </button>
              }
            />
          ) : (
            <div
              className="firstAgreement"
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="paperIllustration" aria-hidden="true">
                <div className="paperOffset" />
                <div className="paperFront">
                  <FileText size={28} />
                  <i />
                  <i />
                  <i />
                  <span>
                    <Check size={13} />
                  </span>
                </div>
              </div>
              <div>
                <div className="eyebrow">START WITH THE SOURCE</div>
                <h3>
                  Your first agreement.
                  <br />A more considered review.
                </h3>
                <p>
                  Bring a contract into your workspace to review its terms,
                  compare versions and track what comes next.
                </p>
                <button
                  className="textLink"
                  disabled={disabled}
                  onClick={onUpload}
                >
                  Choose a document <Upload size={15} />
                </button>
                <small>
                  PDF, Word or TXT · 20 MB per file · Up to 10 files
                </small>
              </div>
            </div>
          )}
        </section>
        <aside className="journeyPanel">
          <div className="eyebrow">A REPEATABLE REVIEW</div>
          <h2>
            Good judgment.
            <br />
            <em>A clear process.</em>
          </h2>
          {[
            {
              n: "01",
              title: "Bring in the agreement",
              text: "Start with the original document.",
              done: agreements.length > 0,
              action: onUpload,
            },
            {
              n: "02",
              title: "Set the standard",
              text: "Define acceptable business terms.",
              done: standards.some((s) => s.data.published),
              action: () => navigate("standards"),
            },
            {
              n: "03",
              title: "Make the decision",
              text: "Review exceptions against the source.",
              done: agreements.some((a) => a.data.reviewedAt),
              action: () => navigate("agreements"),
            },
            {
              n: "04",
              title: "Keep the commitment",
              text: "Confirm the owner and deadline.",
              done: commitments.length > 0,
              action: () => navigate("commitments"),
            },
          ].map((step) => (
            <button className="journeyStep" key={step.n} onClick={step.action}>
              <span className={step.done ? "complete" : ""}>
                {step.done ? <Check size={13} /> : step.n}
              </span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
              </div>
              <ArrowUpRight size={14} />
            </button>
          ))}
          <p className="journeyNote">
            Suggested wording stays a proposal
            <br />
            until you record your decision.
          </p>
        </aside>
      </div>
      <section className="panel deadlineStrip">
        <SectionHeading
          number="02"
          title="What comes next"
          detail="Confirmed dates, accountable owners."
          action={
            <TextLink onClick={() => navigate("commitments")}>
              All commitments
            </TextLink>
          }
        />
        {due.length ? (
          <div className="deadlineList">
            {due.slice(0, 3).map((c) => (
              <button key={c.id} onClick={() => navigate("commitments")}>
                <span className="deadlineDate">
                  {businessDate(c.data.date)}
                </span>
                <strong>{c.data.name}</strong>
                <span>{c.data.owner || "Owner to confirm"}</span>
                <Badge
                  tone={
                    deadlineState(c.data.date, false) === "Overdue"
                      ? "red"
                      : "amber"
                  }
                >
                  {deadlineState(c.data.date, false) === "Overdue"
                    ? "Overdue"
                    : "Due soon"}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <div className="quietEmpty">
            <span className="tinyRule" />
            No confirmed deadlines due in the next 30 days.
            <button
              className="textLink"
              onClick={() => navigate("commitments")}
            >
              Plan the next step
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
