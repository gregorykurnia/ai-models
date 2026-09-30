import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || "http://localhost:3191";
const cloud = [];
let available = false;
let posts = 0;
async function isolatedContext() {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route("**/api/suitability/tasks", async route => {
    if (route.request().method() === "POST") {
      posts++;
      if (available) {
        const comparison = route.request().postDataJSON();
        cloud.splice(0, cloud.length, comparison);
      }
    }
    await route.fulfill({ status: available ? 200 : 503, contentType: "application/json",
      body: JSON.stringify(available ? route.request().method() === "POST" ? { taskId: cloud[0].task.id } : cloud : { error: "Firestore quota exhausted (fixture)." }) });
  });
  return context;
}

try {
  const context = await isolatedContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/suitability`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel("Task title", { exact: true }).fill("Quota fallback comparison");
  await page.getByLabel("Task description", { exact: true }).fill("Preserve these task settings and pinned results.");
  const evaluations = page.getByRole("heading", { name: "2. Choose evaluations and weights" }).locator("..");
  await evaluations.getByRole("checkbox").nth(0).check();
  await evaluations.getByRole("checkbox").nth(1).check();
  await page.getByRole("checkbox", { name: /^Select .+, .+/ }).first().check();
  await page.getByRole("button", { name: "Save task and compare models", exact: true }).click();
  await page.waitForURL(/\/suitability\/[A-Za-z0-9_-]+$/);
  const taskUrl = page.url();
  const results = page.getByRole("region", { name: "Suitability results, scroll horizontally for all evaluations" });
  await results.locator("tbody tr").first().waitFor();
  const originalScore = await results.locator("tbody tr").first().locator("td").nth(1).innerText();
  assert(await page.getByText(/Saved in this browser · shared sync pending/).isVisible());
  assert.equal(posts, 1, "Failed cloud save must fall back to a verified browser save");
  await page.reload();
  await results.locator("tbody tr").first().waitFor();
  assert.equal(await results.locator("tbody tr").first().locator("td").nth(1).innerText(), originalScore);
  await page.getByRole("button", { name: "Edit settings", exact: true }).click();
  assert.equal(await page.getByLabel("Task description", { exact: true }).inputValue(), "Preserve these task settings and pinned results.");
  await page.getByLabel("Task title", { exact: true }).fill("Edited browser comparison");
  await page.getByRole("button", { name: "Save in this browser", exact: true }).click();
  await page.getByRole("heading", { name: "Edited browser comparison", exact: true }).waitFor();
  assert.equal(page.url(), taskUrl, "Edits must preserve the task ID");
  assert.equal(posts, 1, "Explicit browser saves must not depend on Firestore");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const download = await downloadPromise;
  const backupPath = join(await mkdtemp(join(tmpdir(), "task-backup-check-")), "comparison.json");
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  assert.equal(backup.task.title, "Edited browser comparison");
  assert(backup.entries.length > 1 && backup.availableSnapshotIds.length === 2);
  const secondContext = await isolatedContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${base}/suitability/saved`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await secondPage.getByLabel("Import a task backup").setInputFiles(backupPath);
  await secondPage.getByRole("status").filter({ hasText: "Backup imported and saved in this browser" }).waitFor();
  await secondPage.getByRole("link", { name: "Open comparison", exact: true }).click();
  await secondPage.getByRole("heading", { name: "Edited browser comparison", exact: true }).waitFor();
  const backupResults = secondPage.getByRole("region", { name: "Suitability results, scroll horizontally for all evaluations" });
  await backupResults.locator("tbody tr").first().waitFor();
  assert.equal(await backupResults.locator("tbody tr").first().locator("td").nth(1).innerText(), originalScore);
  available = true;
  await page.getByRole("button", { name: "Sync browser tasks to shared library", exact: true }).click();
  await page.getByText("Saved to the shared library.", { exact: true }).waitFor();
  assert.equal(cloud[0].task.id, backup.task.id);
  assert.deepEqual(cloud[0].entries, backup.entries);
  await page.reload();
  await page.getByRole("heading", { name: "Edited browser comparison", exact: true }).waitFor();
  assert(await page.getByText("Saved to the shared library.", { exact: true }).isVisible());
  await page.getByRole("button", { name: "Edit settings", exact: true }).click();
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException("Storage full", "QuotaExceededError"); }; });
  await page.getByLabel("Task title", { exact: true }).fill("Must not report saved");
  await page.getByRole("button", { name: "Save in this browser", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "The task was not saved." }).waitFor();
  assert.equal(await page.getByLabel("Task title", { exact: true }).inputValue(), "Must not report saved");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ failedCloudFallback: true, reloadRetainsScores: true, editsKeepId: true, backupRoundTrip: true, laterSync: true, storageFailureIsExplicit: true }));
} finally { await browser.close(); }
