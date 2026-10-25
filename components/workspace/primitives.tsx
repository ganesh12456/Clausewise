"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, FileText, LockKeyhole, X } from "lucide-react";
export function Brand() {
  return (
    <a className="brand" href="#desk" aria-label="Clausewise review desk">
      <span className="brandMark" aria-hidden="true">
        <i />
        <i />
      </span>
      clausewise<span className="brandPeriod">.</span>
    </a>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="pageHeading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({
  number,
  title,
  detail,
  action,
}: {
  number?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sectionHeading">
      <div>
        {number && <span className="sectionNumber">{number}</span>}
        <div>
          <h2>{title}</h2>
          {detail && <p>{detail}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={"emptyState" + (compact ? " compactEmpty" : "")}>
      <span className="emptyIcon">
        <FileText size={23} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return (
    <span className={"badge " + tone}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="textLink" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
export function TrustNote() {
  return (
    <span className="trustNote">
      <LockKeyhole size={13} />
      Owner-only workspace
    </span>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modalInner">
        <button
          className="iconButton closeModal"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        <div className="eyebrow">CLAUSEWISE / WORKFLOW</div>
        <h2 id="dialog-title">{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </div>
    </dialog>
  );
}
