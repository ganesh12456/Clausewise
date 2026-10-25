import assert from "node:assert/strict";
import { Datastore } from "@zcatalyst/datastore";
import {
  CatalystIndex,
  createCatalystStore,
} from "../lib/server/catalyst/sdk.ts";
import { ownerKey } from "../lib/server/catalyst/store.ts";
import { endpoint } from "../lib/http.ts";
import { RecordError } from "../lib/server/application/records.ts";
const db = new Datastore({});
const requests: any[] = [];
const owner = ownerKey("owner' OR 1=1"),
  key = `${owner}:1`;
const row = {
  commit_key: key,
  owner_key: owner,
  revision: "1",
  payload_key: "cw/test.json",
  payload_hash: "0".repeat(64),
  created: new Date().toISOString(),
};
(db.requester as any).send = async (request: any) => {
  requests.push(request);
  if (request.path === "/query")
    return { data: { data: [{ CWCommits: row }] } };
  return {
    data: {
      data: request.data.map((row: any) => ({ ...row, ROWID: "123456789" })),
    },
  };
};
const index = new CatalystIndex(db);
assert.equal((await index.latest(owner))?.revision, 1);
assert.equal((await index.find(key))?.payload_key, "cw/test.json");
await index.insert({ ...row, revision: 1 });
assert(
  requests.some(
    (r) =>
      r.path === "/query" &&
      r.data.query.includes("ORDER BY revision DESC LIMIT 1"),
  ),
);
assert(requests.every((r) => !JSON.stringify(r).includes("OR 1=1")));
assert(requests.some((r) => r.data?.[0]?.commit_key === key));
await assert.rejects(index.find("unsafe'"), /Invalid index key/);
const savedProject = process.env.CATALYST_PROJECT_ID,
  savedBucket = process.env.CATALYST_STRATUS_BUCKET;
process.env.CATALYST_PROJECT_ID = "123";
process.env.CATALYST_STRATUS_BUCKET = "test-bucket";
await assert.rejects(
  createCatalystStore({ "x-zc-projectid": "456" }),
  /mismatched/,
);
await assert.rejects(createCatalystStore({}), /mismatched/);
if (savedProject === undefined) delete process.env.CATALYST_PROJECT_ID;
else process.env.CATALYST_PROJECT_ID = savedProject;
if (savedBucket === undefined) delete process.env.CATALYST_STRATUS_BUCKET;
else process.env.CATALYST_STRATUS_BUCKET = savedBucket;
const response = await endpoint(async () => {
  throw new RecordError("Refresh before saving", "conflict");
})(new Request("https://example.test/api"));
assert.equal(response.status, 409);
console.log(
  "Catalyst modular SDK: row envelopes, revision conversion, insert transport, query safety, project binding and conflict HTTP response passed",
);
