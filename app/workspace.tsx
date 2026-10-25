"use client";
import { useEffect, useState } from "react";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import { useWorkspace } from "../hooks/use-workspace";
import type {
  Agreement,
  AgreementData,
  CommitmentData,
  Standard,
  StandardData,
  View,
  WorkspaceBootstrap,
  WorkspaceRecord,
} from "../lib/domain/workspace";
import { WorkspaceShell } from "../components/workspace/shell";
import { ReviewDesk } from "../components/workspace/desk";
import { AgreementLibrary } from "../components/workspace/agreements";
import { AgreementReview } from "../components/workspace/review";
import {
  Commitments,
  CompanyStandards,
  Connections,
  DecisionHistory,
  VersionComparison,
} from "../components/workspace/governance";
import {
  CommitmentDialog,
  StandardDialog,
  UploadDialog,
} from "../components/workspace/forms";
const views: View[] = [
  "desk",
  "agreements",
  "standards",
  "compare",
  "commitments",
  "history",
  "connections",
];
type Dialog =
  | { kind: "upload" }
  | { kind: "standard"; standard?: Standard }
  | { kind: "commitment"; agreementId?: string }
  | null;
export default function Workspace({
  initial,
}: {
  initial?: WorkspaceBootstrap;
}) {
  const workspace = useWorkspace(undefined, initial);
  const { snapshot, agreements, standards, commitments } = workspace;
  const [view, setView] = useState<View>("desk"),
    [selected, setSelected] = useState(""),
    [dialog, setDialog] = useState<Dialog>(null);
  useEffect(() => {
    function route() {
      const [target, id] = window.location.hash.slice(1).split("/");
      setView(views.includes(target as View) ? (target as View) : "desk");
      try {
        setSelected(id ? decodeURIComponent(id) : "");
      } catch {
        setSelected("");
      }
    }
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  function navigate(next: View, id = "") {
    setView(next);
    setSelected(id);
    window.location.hash = next + (id ? "/" + encodeURIComponent(id) : "");
    workspace.clearError();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const agreement = agreements.find((a) => a.id === selected);
  const disabled =
    !!workspace.busy || workspace.loading || workspace.requiresSignIn;
  function open(id: string) {
    navigate("agreements", id);
  }
  function add() {
    if (workspace.requiresSignIn) {
      window.location.assign("/login");
      return;
    }
    if (!workspace.busy) setDialog({ kind: "upload" });
  }
  async function save(record: WorkspaceRecord, data: WorkspaceRecord["data"]) {
    return workspace.perform("Recording your changes…", () =>
      workspace.gateway.save(record, data),
    );
  }
  async function saveStandard(data: StandardData) {
    const result = await workspace.perform("Saving company standard…", () =>
      dialog?.kind === "standard" && dialog.standard
        ? workspace.gateway.save(dialog.standard, data)
        : workspace.gateway.create("policy", data),
    );
    if (result) setDialog(null);
  }
  async function saveCommitment(data: CommitmentData) {
    const result = await workspace.perform("Recording commitment…", () =>
      workspace.gateway.create("obligation", data),
    );
    if (result) {
      setDialog(null);
      navigate("commitments");
    }
  }
  async function upload(files: File[]) {
    const id = await workspace.upload(files);
    if (id) {
      setDialog(null);
      open(id);
    }
  }
  async function remove(a: Agreement) {
    if (
      !confirm(
        "Delete this agreement, its original file and all linked commitments? This cannot be undone.",
      )
    )
      return;
    const result = await workspace.perform("Deleting agreement…", () =>
      workspace.gateway.remove(a),
    );
    if (result) navigate("agreements");
  }
  return (
    <WorkspaceShell
      view={view}
      user={snapshot.user}
      count={agreements.length}
      navigate={navigate}
      onUpload={add}
      disabled={disabled}
      onLogout={() =>
        void workspace.perform("Signing out…", async () => {
          await workspace.gateway.logout();
          window.location.assign("/login");
        })
      }
    >
      {workspace.error && (
        <div className="notice error" role="alert">
          <span>{workspace.error}</span>
          <button className="textLink" onClick={() => void workspace.refresh()}>
            Try again
            <RefreshCw size={13} />
          </button>
          <button
            className="iconButton"
            aria-label="Dismiss error"
            onClick={workspace.clearError}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {workspace.busy && (
        <div className="notice progressNotice" role="status">
          <span className="spinner" />
          {workspace.busy}
        </div>
      )}
      {workspace.requiresSignIn && (
        <div className="signInNotice">
          <span>
            Your workspace is private. Sign in to access agreements and record
            decisions.
          </span>
          <a href="/login">
            Sign in
            <ArrowRight size={15} />
          </a>
        </div>
      )}
      {workspace.loading ? (
        <div className="workspaceLoading" role="status">
          <span className="spinner" />
          <h1>Preparing your review desk.</h1>
          <p>Bringing your agreements and next steps together.</p>
        </div>
      ) : (
        <>
          {view === "desk" && (
            <ReviewDesk
              agreements={agreements}
              standards={standards}
              commitments={commitments}
              navigate={navigate}
              open={open}
              onUpload={add}
              disabled={disabled}
              privateView={workspace.requiresSignIn}
            />
          )}
          {view === "agreements" &&
            (agreement ? (
              <AgreementReview
                key={agreement.id}
                agreement={agreement}
                standards={standards}
                commitments={commitments}
                ai={snapshot.ai}
                busy={disabled}
                onSave={(data: AgreementData) => save(agreement, data)}
                onDelete={() => void remove(agreement)}
                onBack={() => navigate("agreements")}
                onCommitment={() =>
                  setDialog({ kind: "commitment", agreementId: agreement.id })
                }
                onStandards={() => navigate("standards")}
                onConnections={() => navigate("connections")}
                onAsk={(question) =>
                  workspace.perform("Finding supporting evidence…", () =>
                    workspace.gateway.ask(agreement.id, question),
                  )
                }
              />
            ) : (
              <AgreementLibrary
                agreements={agreements}
                open={open}
                onUpload={add}
                disabled={disabled}
              />
            ))}
          {view === "standards" && (
            <CompanyStandards
              standards={standards}
              disabled={disabled}
              onCreate={() => setDialog({ kind: "standard" })}
              onEdit={(standard) => setDialog({ kind: "standard", standard })}
              onPublish={(standard) =>
                void save(standard, {
                  ...standard.data,
                  published: !standard.data.published,
                })
              }
            />
          )}
          {view === "compare" && (
            <VersionComparison
              agreements={agreements}
              onUpload={add}
              open={open}
            />
          )}
          {view === "commitments" && (
            <Commitments
              agreements={agreements}
              commitments={commitments}
              disabled={disabled}
              onCreate={() => setDialog({ kind: "commitment" })}
              onToggle={(c) => void save(c, { ...c.data, done: !c.data.done })}
            />
          )}
          {view === "history" && <DecisionHistory events={snapshot.events} />}
          {view === "connections" && (
            <Connections
              connected={snapshot.ai}
              userEmail={snapshot.user?.email}
              onAiChange={workspace.setAi}
            />
          )}
        </>
      )}
      {dialog?.kind === "upload" && (
        <UploadDialog
          busy={!!workspace.busy}
          onClose={() => setDialog(null)}
          onUpload={(files) => void upload(files)}
        />
      )}
      {dialog?.kind === "standard" && (
        <StandardDialog
          standard={dialog.standard}
          busy={!!workspace.busy}
          onClose={() => setDialog(null)}
          onSave={(data) => void saveStandard(data)}
        />
      )}
      {dialog?.kind === "commitment" && (
        <CommitmentDialog
          agreements={agreements}
          agreementId={dialog.agreementId}
          busy={!!workspace.busy}
          onClose={() => setDialog(null)}
          onSave={(data) => void saveCommitment(data)}
        />
      )}
    </WorkspaceShell>
  );
}
