// Self-healing local setup: if .env.local doesn't exist yet, seed it from
// .env.example so `npm run dev`/`npm run build` work out of the box on a
// fresh clone, instead of silently falling back to an empty
// VITE_API_BASE_URL (which 404s every request against the Vite dev server
// itself rather than the real backend). Never overwrites an existing
// .env.local -- local customizations are left alone.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const frontendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const example = path.join(frontendDir, ".env.example");
const local = path.join(frontendDir, ".env.local");

if (!existsSync(local)) {
  copyFileSync(example, local);
  console.log("[ensure-env] Created frontend/.env.local from .env.example (defaults to the local Docker backend at http://localhost).");
}
