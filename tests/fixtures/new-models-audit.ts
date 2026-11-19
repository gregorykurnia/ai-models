import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));
const run = promisify(execFile);
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;

export const gptReport = "docs/GPT_6_2_ASTRA_SOL_COVERAGE.md";
export const hydrogenReport = "docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md";
export const neonReport = "docs/GEMINI_4_NEON_COVERAGE.md";

export function audit(cwd: string, ...args: string[]) {
  return run(process.execPath, [
    "--import", import.meta.resolve("tsx"), join(root, "scripts/audit-new-models-coverage.ts"), ...args,
  ], { cwd, env });
}

export async function auditWorkspace(t: { after(cleanup: () => Promise<void>): void }): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "ai-model-coverage-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await Promise.all([mkdir(join(cwd, "docs")), mkdir(join(cwd, "data"))]);
  await Promise.all([
    "aa-captures", "aa-briefcase-components.json", "aa-briefcase-rubric-refresh.json",
    "aa-model-profile-overlays.json", "leaderboards.json",
  ].map(file => symlink(join(root, "data", file), join(cwd, "data", file))));
  return cwd;
}
