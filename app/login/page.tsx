"use client";
import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Brand } from "../../components/workspace/primitives";
import { requestJson } from "../../lib/client/gateway";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="loginPage">
      <section className="loginStory">
        <Brand />
        <div className="loginStoryCopy">
          <div className="eyebrow">THE CONSIDERED AGREEMENT</div>
          <h1>
            Good agreements
            <br />
            start with
            <br />
            <em>clear decisions.</em>
          </h1>
          <p>
            Bring the terms, your company standards and the next business
            commitment into perspective.
          </p>
          <div className="loginStorySteps">
            <span>
              <i>01</i>Understand the source
            </span>
            <span>
              <i>02</i>Resolve the terms
            </span>
            <span>
              <i>03</i>Keep the commitment
            </span>
          </div>
        </div>
        <div className="loginStoryFooter">
          CLAUSEWISE / EVIDENCE FIRST. DECISIONS YOURS.
        </div>
      </section>
      <main className="loginFormSide">
        <div className="loginFormCard">
          <div className="eyebrow">YOUR PRIVATE WORKSPACE</div>
          <h2>Welcome to your review desk.</h2>
          <p>
            Sign in to continue your agreement reviews, decisions and
            commitments.
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(e.currentTarget);
              try {
                await requestJson("/api/auth", {
                  email: form.get("email"),
                  password: form.get("password"),
                });
                window.location.assign("/");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to sign in");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="fieldLabel">
              Workspace email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@company.com"
              />
            </label>
            <label className="fieldLabel">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
              />
            </label>
            <button className="primary" disabled={busy} type="submit">
              {busy ? "Opening your workspace…" : "Open your workspace"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="loginPrivateNote">
            <LockKeyhole size={12} />
            Your agreements remain in your private workspace.
          </div>
        </div>
        <p className="loginFormFooter">
          Access is managed by your workspace owner.
          <br />
          Contact them if you need help signing in.
        </p>
      </main>
    </div>
  );
}
