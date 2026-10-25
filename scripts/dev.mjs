import { spawn } from "node:child_process";
// Accept host/port flags from managed previews without coupling the app to a host.
const args = process.argv.slice(2);
let host = "0.0.0.0",
  port = "3000";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--host" || args[i] === "--hostname") host = args[++i];
  else if (args[i] === "--port" || args[i] === "-p") port = args[++i];
}
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    host,
    "--port",
    port,
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
