import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, access } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "dist/appsail");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed (${result.status})`);
}

if (process.platform !== "linux" || process.arch !== "x64") {
  throw new Error(
    "Build on Linux x64 for AppSail. Use the GitHub Actions build artifact on Windows/macOS.",
  );
}
run(process.execPath, ["scripts/copy-pdf-worker.mjs"]);
run(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
  {
    env: { ...process.env, CLAUSEWISE_APPSAIL_BUILD: "1" },
  },
);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(path.join(root, ".next/standalone"), destination, { recursive: true });
// Next does not include static assets in standalone output by default.
await cp(
  path.join(root, ".next/static"),
  path.join(destination, ".next/static"),
  { recursive: true },
);
await cp(path.join(root, "public"), path.join(destination, "public"), {
  recursive: true,
});
await mkdir(path.join(destination, "scripts"), { recursive: true });
for (const name of ["start.mjs"]) {
  await cp(
    path.join(root, "scripts", name),
    path.join(destination, "scripts", name),
  );
}
// Next may copy local env files into standalone output. Runtime values belong in Zoho.
for (const name of await readdir(destination)) {
  if (name.startsWith(".env"))
    await rm(path.join(destination, name), { force: true });
}
for (const name of [
  "server.js",
  "scripts/start.mjs",
  "public/pdf.worker.min.mjs",
]) {
  await access(path.join(destination, name));
}
const requireFromBuild = createRequire(path.join(destination, "package.json"));
for (const dependency of [
  "@zcatalyst/auth",
  "@zcatalyst/auth-admin",
  "@zcatalyst/datastore",
  "@zcatalyst/stratus",
]) {
  const resolved = requireFromBuild.resolve(dependency);
  if (!resolved.startsWith(destination + path.sep))
    throw new Error(`Catalyst dependency missing: ${dependency}`);
}
const manifest = JSON.parse(
  await readFile(path.join(destination, "package.json"), "utf8"),
);
if (!manifest.name) throw new Error("Standalone package manifest is missing");
const archive = path.join(root, "dist/clausewise-appsail.zip");
await rm(archive, { force: true });
run("zip", ["-q", "-r", archive, "."], { cwd: destination });
console.log("AppSail build ready: dist/clausewise-appsail.zip");
console.log(
  "Runtime: Node.js 22; startup command: node scripts/start.mjs --standalone",
);
