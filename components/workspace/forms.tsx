"use client";
import { useState } from "react";
import { ArrowRight, FileText, Plus, Trash2, Upload } from "lucide-react";
import type { Rule } from "../../lib/engine";
import type {
  Agreement,
  CommitmentData,
  Standard,
  StandardData,
} from "../../lib/domain/workspace";
import { Modal } from "./primitives";
export function UploadDialog({
  busy,
  onClose,
  onUpload,
}: {
  busy: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]),
    [error, setError] = useState("");
  function choose(incoming: File[]) {
    setError("");
    if (incoming.length > 10) {
      setError("Choose up to 10 files per batch.");
      return;
    }
    setFiles(incoming);
  }
  return (
    <Modal
      title="Start with the source agreement."
      description="Upload the original documents. Your next step is to check their terms against a company standard."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUpload(files);
        }}
      >
        <label
          className="uploadZone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(Array.from(e.dataTransfer.files));
          }}
        >
          <Upload size={29} />
          <strong>Drop your agreements here</strong>
          <span>or choose files from your device</span>
          <small>PDF, Word (.docx), TXT · 20 MB each · Up to 100 pages</small>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            onChange={(e) => choose(Array.from(e.target.files || []))}
            disabled={busy}
          />
        </label>
        {error && (
          <p className="formError" role="alert">
            {error}
          </p>
        )}
        {files.length > 0 && (
          <ul className="selectedFiles">
            {files.map((f, i) => (
              <li key={f.name + i}>
                <FileText size={15} />
                <span>{f.name}</span>
                <small>{(f.size / 1024).toFixed(0)} KB</small>
              </li>
            ))}
          </ul>
        )}
        <div className="formNotice">
          Text is extracted from your files. Scans with no readable text need
          OCR before they can be reviewed.
        </div>
        <div className="modalActions">
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="primary" disabled={!files.length || busy}>
            {busy
              ? "Processing agreements…"
              : `Add ${files.length || ""} agreement${files.length === 1 ? "" : "s"}`}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function newRule(): Rule {
  return {
    id: crypto.randomUUID(),
    name: "",
    phrase: "",
    mode: "prohibited",
    severity: "High",
    replacement: "",
  };
}
export function StandardDialog({
  standard,
  busy,
  onClose,
  onSave,
}: {
  standard?: Standard;
  busy: boolean;
  onClose: () => void;
  onSave: (data: StandardData) => void;
}) {
  const [rules, setRules] = useState<Rule[]>(() =>
    standard ? standard.data.rules : [newRule()],
  );
  function change(index: number, patch: Partial<Rule>) {
    setRules((current) =>
      current.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }
  return (
    <Modal
      title={
        standard
          ? "Refine your company standard."
          : "Set your negotiating position."
      }
      description="Write explicit checks for the terms that matter to your business. A reviewer will interpret every match in context."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({ name: String(f.get("name")), published: false, rules });
        }}
      >
        <label className="fieldLabel">
          Company standard name
          <input
            autoFocus
            required
            name="name"
            maxLength={250}
            defaultValue={standard?.data.name}
            placeholder="e.g. Supplier agreement standard"
          />
        </label>
        {rules.map((rule, i) => (
          <fieldset className="ruleEditor" key={rule.id}>
            <legend>CLAUSE RULE {String(i + 1).padStart(2, "0")}</legend>
            <div className="ruleEditorTop">
              <label className="fieldLabel">
                Business concern
                <input
                  required
                  value={rule.name}
                  onChange={(e) => change(i, { name: e.target.value })}
                  placeholder="e.g. Automatic renewal notice"
                />
              </label>
              {rules.length > 1 && (
                <button
                  type="button"
                  className="iconButton danger"
                  disabled={busy}
                  aria-label={"Remove rule " + (i + 1)}
                  onClick={() =>
                    setRules((current) =>
                      current.filter((r) => r.id !== rule.id),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="formGrid">
              <label className="fieldLabel">
                What should be checked?
                <select
                  value={rule.mode}
                  onChange={(e) =>
                    change(i, { mode: e.target.value as Rule["mode"] })
                  }
                >
                  <option value="prohibited">
                    Flag when this wording appears
                  </option>
                  <option value="required">
                    Flag when expected wording is missing
                  </option>
                </select>
              </label>
              <label className="fieldLabel">
                Review priority
                <select
                  value={rule.severity}
                  onChange={(e) =>
                    change(i, { severity: e.target.value as Rule["severity"] })
                  }
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
            </div>
            <label className="fieldLabel">
              Exact phrase
              <input
                required
                value={rule.phrase}
                onChange={(e) => change(i, { phrase: e.target.value })}
                placeholder="e.g. automatically renew"
              />
            </label>
            <label className="fieldLabel">
              Preferred alternative wording
              <textarea
                value={rule.replacement}
                onChange={(e) => change(i, { replacement: e.target.value })}
                rows={3}
                placeholder="Write your preferred clause for the reviewer to consider."
              />
            </label>
          </fieldset>
        ))}
        <button
          type="button"
          className="textLink"
          disabled={rules.length >= 100 || busy}
          onClick={() => setRules((current) => [...current, newRule()])}
        >
          <Plus size={15} />
          Add another clause rule
        </button>
        <div className="formNotice">
          Saved as a draft. Publish the standard after reviewing its rules.
          Existing agreement reviews keep their original rule snapshots.
        </div>
        <div className="modalActions">
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save draft
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function CommitmentDialog({
  agreements,
  agreementId,
  busy,
  onClose,
  onSave,
}: {
  agreements: Agreement[];
  agreementId?: string;
  busy: boolean;
  onClose: () => void;
  onSave: (data: CommitmentData) => void;
}) {
  return (
    <Modal
      title="Make the next action accountable."
      description="Confirm the obligation, its owner and its deadline against the source agreement."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            name: String(f.get("name")),
            contractId: String(f.get("agreement")),
            date: String(f.get("date")),
            owner: String(f.get("owner")),
            evidence: String(f.get("evidence")),
            done: false,
          });
        }}
      >
        <label className="fieldLabel">
          Commitment or action
          <input
            autoFocus
            name="name"
            required
            maxLength={250}
            placeholder="e.g. Send renewal cancellation notice"
          />
        </label>
        <label className="fieldLabel">
          Source agreement
          <select name="agreement" required defaultValue={agreementId || ""}>
            <option value="">Choose an agreement</option>
            {agreements.map((a) => (
              <option value={a.id} key={a.id}>
                {a.data.name}
              </option>
            ))}
          </select>
        </label>
        <div className="formGrid">
          <label className="fieldLabel">
            Confirmed action deadline
            <input name="date" type="date" required />
          </label>
          <label className="fieldLabel">
            Accountable owner
            <input
              name="owner"
              required
              placeholder="Person or business team"
            />
          </label>
        </div>
        <label className="fieldLabel">
          Supporting clause and date calculation
          <textarea
            name="evidence"
            rows={4}
            required
            placeholder="Copy the relevant clause. Explain how you confirmed the deadline."
          />
        </label>
        <label className="confirmCheckbox">
          <input type="checkbox" required />
          <span>
            I have checked this deadline against the source agreement.
          </span>
        </label>
        <div className="modalActions">
          <button
            className="secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Record commitment
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
