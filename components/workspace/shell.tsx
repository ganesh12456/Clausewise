"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Columns2,
  FolderClosed,
  History,
  LogOut,
  Menu,
  Plug,
  ShieldCheck,
} from "lucide-react";
import type { View, User } from "../../lib/domain/workspace";
import { Brand, Modal, TrustNote } from "./primitives";
const items = [
  { id: "desk", label: "Review desk", icon: BriefcaseBusiness },
  { id: "agreements", label: "Agreements", icon: FolderClosed },
  { id: "compare", label: "Compare versions", icon: Columns2 },
  { id: "commitments", label: "Commitments", icon: CalendarDays },
  { id: "standards", label: "Company standards", icon: BookOpen },
  { id: "history", label: "Decision history", icon: History },
  { id: "connections", label: "Connections", icon: Plug },
] as const;
export function WorkspaceShell({
  view,
  children,
  user,
  count,
  navigate,
  onUpload,
  onLogout,
  disabled,
}: {
  view: View;
  children: ReactNode;
  user: User | null;
  count: number;
  navigate: (v: View) => void;
  onUpload: () => void;
  onLogout: () => void;
  disabled: boolean;
}) {
  const [mobile, setMobile] = useState(false);
  const navigation = (
    <nav aria-label="Main navigation">
      {items.map((item, i) => (
        <div key={item.id}>
          {i === 0 && <div className="navGroup">WORKSPACE</div>}
          {i === 4 && <div className="navGroup secondGroup">GOVERNANCE</div>}
          <a
            href={"#" + item.id}
            aria-current={view === item.id ? "page" : undefined}
            className={view === item.id ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.id);
              setMobile(false);
            }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.id === "agreements" && <small>{count}</small>}
          </a>
        </div>
      ))}
    </nav>
  );
  return (
    <div className="appShell">
      <a className="skipLink" href="#main-content">
        Skip to workspace
      </a>
      <aside className="workspaceRail">
        <Brand />
        <div className="workspaceIdentity">
          <span className="identityMonogram">CW</span>
          <div>
            Contract workspace<small>Private business review</small>
          </div>
          <span className="identityDot" />
        </div>
        {navigation}
        <div className="railBottom">
          <div className="railNote">
            <ShieldCheck size={20} />
            <span>
              Sound agreements begin
              <br />
              with considered decisions.
            </span>
          </div>
          <div className="account">
            <span className="accountAvatar">
              {user?.email.slice(0, 1).toUpperCase() || "CW"}
            </span>
            <div>
              <strong>{user ? "Workspace owner" : "Private workspace"}</strong>
              <small title={user?.email}>
                {user?.email || "Sign in to begin"}
              </small>
            </div>
            {user ? (
              <button
                className="railIcon"
                onClick={onLogout}
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <a href="/login" className="railIcon" aria-label="Sign in">
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </div>
      </aside>
      <div className="workspaceBody">
        <header className="workspaceHeader">
          <div className="headerTrail">
            <span className="mobileBrand">clausewise.</span>
            <button
              className="mobileMenu iconButton"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="desktopTrail">
              Workspace<span className="trailSlash">/</span>
            </span>
            <strong>{items.find((i) => i.id === view)?.label}</strong>
          </div>
          <div className="headerActions">
            <TrustNote />
            <span className="headerDivider" />
            <button
              className="headerUpload"
              disabled={disabled}
              onClick={onUpload}
            >
              Add agreement <span>+</span>
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspaceFooter">
          <span>
            CLAUSEWISE <i>Contract review, with perspective.</i>
          </span>
          <span>Evidence first. Decisions yours.</span>
        </footer>
      </div>
      {mobile && (
        <Modal title="Your workspace" onClose={() => setMobile(false)}>
          {navigation}
        </Modal>
      )}
    </div>
  );
}
