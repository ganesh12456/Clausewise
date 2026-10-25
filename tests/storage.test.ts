import assert from "node:assert/strict";
import { CloudWorkspace } from "../lib/server/catalyst/workspace.ts";
import {
  CatalystStore,
  OutcomeUnknownError,
  digest,
  ownerKey,
} from "../lib/server/catalyst/store.ts";
import { fixture } from "./catalyst-fixtures.ts";
const f = fixture(),
  workspace = new CloudWorkspace(f.store),
  owner = "owner@example.test",
  other = "other@example.test";
const text = "Payment due in 30 days. Agreement 测试 📄";
const doc = {
  name: "Contract 📄",
  filename: "contract.txt",
  text,
  pages: [{ page: 1, text }],
  sha256: digest(Buffer.from(text)),
  coverage: "Text",
  findings: [],
};
const { id } = await workspace.upload(
  owner,
  "contract.txt",
  doc,
  Buffer.from(text),
);
assert.equal((await workspace.load(owner)).records.length, 1);
assert.equal((await workspace.load(other)).records.length, 0);
assert.equal(await workspace.original(other, id), null);
assert.equal(
  Buffer.from((await workspace.original(owner, id))!.content).toString(),
  text,
);
await assert.rejects(
  workspace.save(other, { id, kind: "contract", data: doc, revision: 1 }),
  { code: "not_found" },
);
await workspace.save(owner, {
  id,
  kind: "contract",
  data: { ...doc, text: "tampered" },
  revision: 1,
});
assert.equal((await workspace.load(owner)).records[0].data.text, text);
await assert.rejects(
  workspace.save(owner, { id, kind: "contract", data: doc, revision: 1 }),
  { code: "conflict" },
);
await assert.rejects(
  workspace.save(owner, {
    kind: "obligation",
    data: { name: "Invalid", date: "2027-02-29", contractId: id },
  }),
  { code: "invalid" },
);
await workspace.save(owner, {
  kind: "obligation",
  data: { name: "Renewal", date: "2028-02-29", contractId: id },
});
assert.equal((await workspace.load(owner)).records.length, 2);
const before = await workspace.load(owner);
f.objects.failPut = true;
await assert.rejects(
  workspace.save(owner, {
    kind: "policy",
    data: {
      name: "Policy",
      rules: [
        {
          name: "Payment",
          phrase: "30 days",
          mode: "required",
          severity: "Low",
        },
      ],
    },
  }),
);
f.objects.failPut = false;
assert.deepEqual(await workspace.load(owner), before);
const originalKey = f.store.originalKey(owner, id);
f.objects.failRemove = true;
await workspace.save(owner, { id, kind: "contract", action: "delete" });
assert.equal((await workspace.load(owner)).records.length, 0);
assert.equal(await workspace.original(owner, id), null);
assert(f.objects.files.has(originalKey));
f.objects.failRemove = false;
await workspace.load(owner);
assert(!f.objects.files.has(originalKey));
assert((await workspace.load(owner)).events.length >= 4);
// Two instances publish from the same base revision. The unique commit key selects one winner.
const c = fixture(),
  second = new CatalystStore(c.index, c.objects);
let release!: () => void,
  arrivals = 0;
const barrier = new Promise<void>((resolve) => {
  release = resolve;
});
const mutate = async (state: any) => {
  arrivals++;
  if (arrivals === 2) release();
  await barrier;
  state.events.push({
    id: crypto.randomUUID(),
    owner,
    action: "Change",
    subject: "Test",
    created: new Date().toISOString(),
  });
};
const race = await Promise.allSettled([
  c.store.transact(owner, mutate),
  second.transact(owner, mutate),
]);
assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
assert.equal(
  race.filter(
    (r) => r.status === "rejected" && (r.reason as any).code === "conflict",
  ).length,
  1,
);
assert.equal((await c.store.read(owner)).state.events.length, 1);
assert.equal(c.objects.files.size, 1);
const lost = fixture();
lost.index.failAfterInsert = true;
await lost.store.transact(owner, (state) => {
  state.events.push({
    id: "test",
    owner,
    action: "Saved",
    subject: "Test",
    created: new Date().toISOString(),
  });
});
assert.equal((await lost.store.read(owner)).state.events.length, 1);
const unknown = fixture();
unknown.index.failBeforeInsert = true;
await assert.rejects(
  new CloudWorkspace(unknown.store).upload(
    owner,
    "contract.txt",
    doc,
    Buffer.from(text),
  ),
  OutcomeUnknownError,
);
assert.equal(unknown.objects.files.size, 2); // preserve both objects when publication cannot be proven
assert.equal((await unknown.store.read(owner)).state.records.length, 0);
const limited = fixture();
const attempts = await Promise.all(
  Array.from({ length: 25 }, () =>
    limited.store.loginAttempt(owner, 123000000),
  ),
);
assert.equal(attempts.filter(Boolean).length, 10);
assert(await limited.store.loginAttempt(owner, 124000000));
assert(await limited.store.loginAttempt(other, 123000000));
const corrupt = fixture();
await corrupt.store.transact(owner, () => undefined);
const current = await corrupt.index.latest(ownerKey(owner));
corrupt.objects.files.set(current!.payload_key, Buffer.from("corrupted"));
await assert.rejects(corrupt.store.read(owner), /integrity/);
console.log(
  "Catalyst storage: Unicode, ownership, original files, atomic audit, rollback, cascade, concurrency, unknown outcomes, cleanup, login limits and integrity passed",
);
