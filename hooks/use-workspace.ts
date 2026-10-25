"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  httpWorkspaceGateway,
  type WorkspaceGateway,
} from "../lib/client/gateway";
import { extractDocument } from "../lib/client/document-extractors";
import type {
  Agreement,
  Commitment,
  Standard,
  WorkspaceBootstrap,
  WorkspaceSnapshot,
} from "../lib/domain/workspace";
const EMPTY: WorkspaceSnapshot = {
  records: [],
  events: [],
  ai: false,
  user: null,
};
export function useWorkspace(
  gateway: WorkspaceGateway = httpWorkspaceGateway,
  initial?: WorkspaceBootstrap,
) {
  const [snapshot, setSnapshot] = useState(initial?.snapshot || EMPTY),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(initial?.error || ""),
    [loading, setLoading] = useState(!initial),
    [requiresSignIn, setRequiresSignIn] = useState(
      initial?.requiresSignIn || false,
    );
  const operation = useRef(false),
    requestId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await gateway.load();
      if (id === requestId.current) {
        setSnapshot(data);
        setRequiresSignIn(false);
      }
    } catch (e) {
      if (id !== requestId.current) return;
      if (e instanceof ApiError && e.status === 401) {
        setRequiresSignIn(true);
        setSnapshot(EMPTY);
      } else
        setError(
          e instanceof Error ? e.message : "Workspace could not be loaded",
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [gateway]);
  useEffect(() => {
    if (!initial) void refresh();
    return () => {
      requestId.current++;
    };
  }, [refresh, initial]);
  const perform = useCallback(
    async <T>(
      label: string,
      work: () => Promise<T>,
    ): Promise<T | undefined> => {
      if (operation.current) return;
      operation.current = true;
      setBusy(label);
      setError("");
      try {
        const result = await work();
        await refresh();
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Please try again");
        await refresh();
        return undefined;
      } finally {
        setBusy("");
        operation.current = false;
      }
    },
    [refresh],
  );
  const upload = useCallback(
    async (files: File[]) =>
      perform("Preparing agreements…", async () => {
        if (files.length > 10)
          throw Error("Upload up to 10 agreements at a time.");
        let last = "";
        let saved = 0;
        try {
          for (const file of files) {
            setBusy("Reading " + file.name);
            const extracted = await extractDocument(file, (message) =>
              setBusy(file.name + " · " + message),
            );
            const body = new FormData();
            body.append("file", file);
            body.append("text", extracted.text);
            body.append("pages", JSON.stringify(extracted.pages));
            body.append("coverage", extracted.coverage);
            setBusy("Saving " + file.name);
            last = (await gateway.upload(body)).id;
            saved++;
          }
        } catch (e) {
          throw new Error(
            (saved
              ? `${saved} agreement${saved === 1 ? " was" : "s were"} saved. `
              : "") +
              (e instanceof Error
                ? e.message
                : "Upload could not be completed"),
          );
        }
        return last;
      }),
    [perform, gateway],
  );
  const agreements = useMemo(
    () => snapshot.records.filter((r): r is Agreement => r.kind === "contract"),
    [snapshot.records],
  );
  const standards = useMemo(
    () => snapshot.records.filter((r): r is Standard => r.kind === "policy"),
    [snapshot.records],
  );
  const commitments = useMemo(
    () =>
      snapshot.records.filter((r): r is Commitment => r.kind === "obligation"),
    [snapshot.records],
  );
  return {
    snapshot,
    agreements,
    standards,
    commitments,
    busy,
    error,
    loading,
    requiresSignIn,
    refresh,
    perform,
    upload,
    gateway,
    clearError: () => setError(""),
    setAi: (ai: boolean) => setSnapshot((s) => ({ ...s, ai })),
  };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
