// One-command local bootstrap: `npm run dev` from the repo root.
//
// Does everything the README's manual steps do:
//   1. Seeds the root .env from .env.example if it doesn't exist yet.
//   2. Brings up the full backend stack (nginx, web, worker, db, redis) via
//      docker-compose, building images as needed.
//   3. Seeds frontend/.env.local from its .env.example if missing (also
//      happens automatically via the frontend's own `predev` hook, but
//      doing it here too means the message shows up before Vite's own
//      output starts streaming).
//   4. Installs frontend dependencies if node_modules is missing.
//   5. Starts the Vite dev server in the foreground, so its logs stream to
//      this same terminal.
//
// Ctrl+C (or the Vite process exiting for any other reason) tears down the
// Docker stack too (`docker-compose down`) -- one signal stops everything,
// on both Windows and Linux/Mac. Use `npm run stop` if you ever need to tear
// the backend down without going through this script at all (e.g. it was
// started separately, or a previous run didn't shut down cleanly).
import { spawnSync, spawn } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontendDir = path.join(repoRoot, "frontend");

function step(message) {
  console.log(`\n\x1b[36m[dev]\x1b[0m ${message}`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\n[dev] "${command} ${args.join(" ")}" failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

// 1. Root .env
const rootEnv = path.join(repoRoot, ".env");
const rootEnvExample = path.join(repoRoot, ".env.example");
if (!existsSync(rootEnv)) {
  step("Creating .env from .env.example (backend/docker-compose config)...");
  copyFileSync(rootEnvExample, rootEnv);
}

// 2. Backend stack
step("Starting the backend stack (docker-compose up -d --build)...");
run("docker-compose", ["up", "-d", "--build"], repoRoot);

// 3. Frontend .env.local
const frontendEnvLocal = path.join(frontendDir, ".env.local");
const frontendEnvExample = path.join(frontendDir, ".env.example");
if (!existsSync(frontendEnvLocal)) {
  step("Creating frontend/.env.local from frontend/.env.example...");
  copyFileSync(frontendEnvExample, frontendEnvLocal);
}

// 4. Frontend deps
if (!existsSync(path.join(frontendDir, "node_modules"))) {
  step("Installing frontend dependencies (npm install)...");
  run("npm", ["install"], frontendDir);
}

// 5. Frontend dev server (foreground, streams to this terminal)
step("Starting the frontend dev server (npm run dev)...");
step("Ctrl+C stops the backend containers too -- no separate teardown step needed.\n");
const vite = spawn("npm", ["run", "dev"], {
  cwd: frontendDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

// Ctrl+C (SIGINT) or a kill (SIGTERM) on this script, or Vite exiting on its
// own for any reason, all funnel through here exactly once -- whichever
// happens first wins, the rest are no-ops (both this script and its child
// can receive Ctrl+C directly from the terminal on some platforms, so this
// guard against double-teardown matters, not just tidiness).
let shuttingDown = false;
function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  step("Stopping backend containers (docker-compose down)...");
  if (!vite.killed) {
    vite.kill();
  }
  spawnSync("docker-compose", ["down"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(exitCode ?? 0);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
vite.on("exit", (code) => shutdown(code ?? 0));
