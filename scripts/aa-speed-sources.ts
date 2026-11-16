import { open, rm } from "node:fs/promises";

export const evaluationTimingSources = [
  { slug: "aa-briefcase", url: "https://artificialanalysis.ai/evaluations/aa-briefcase" },
  { slug: "automationbench-aa", url: "https://artificialanalysis.ai/evaluations/automationbench-aa" },
  { slug: "terminalbench-4-0", url: "https://artificialanalysis.ai/evaluations/terminalbench-4-0" },
  { slug: "frontiercode-2-0", url: "https://artificialanalysis.ai/evaluations/frontiercode-2-0" },
  { slug: "omniscience", url: "https://artificialanalysis.ai/evaluations/omniscience" },
  { slug: "gdp-pdf", url: "https://artificialanalysis.ai/evaluations/gdp-pdf" },
  { slug: "hle-diamond", url: "https://artificialanalysis.ai/evaluations/hle-diamond" },
  { slug: "critpt-v2-hard", url: "https://artificialanalysis.ai/evaluations/critpt-v2?critpt-subset=hard" },
  { slug: "terminal-bench-science", url: "https://artificialanalysis.ai/evaluations/terminal-bench-science" },
] as const;

export type TimingEvaluation = {
  evaluation_slug: string;
  source_url: string;
  captured_at: string;
  title: string;
  unit: "seconds";
  metric_path: "EvaluationDataProvider.selectedModels[].evalTimePerTask";
  time_chart_present: boolean;
  selected_model_count: number;
  selector: string;
  items: Array<{ id: string; name: string; url: string; seconds: number }>;
};

export type TimingCapture = {
  format_version: 1;
  unit_evidence: { source_url: string; captured_at: string; sha256: string; excerpt: string };
  evaluations: TimingEvaluation[];
};

// Both commands share one lock so a capture cannot change under an import, or an older run win a race.
export async function withSpeedCaptureLock<T>(run: () => Promise<T>): Promise<T> {
  const path = "data/.aa-speed.lock";
  const lock = await open(path, "wx").catch(error => {
    if (error.code === "EEXIST") throw new Error(`AA speed capture/import is already running (${path}; remove a leftover lock only after checking its PID has stopped)`);
    throw error;
  });
  try {
    await lock.writeFile(`${process.pid}\n`);
    return await run();
  } finally {
    await lock.close();
    await rm(path);
  }
}

// Fail closed: a missing payload or failed "Select all" must never erase verified timings.
export function validateTimingCapture(capture: TimingCapture, capturedAt: string): void {
  if (capture.format_version !== 1 || !Array.isArray(capture.evaluations)) throw new Error("Unsupported AA timing capture format");
  const evidence = capture.unit_evidence;
  if (!evidence?.source_url?.startsWith("https://artificialanalysis.ai/_next/static/") || !/^[a-f0-9]{64}$/.test(evidence.sha256)
    || !evidence.excerpt.includes("evalTimePerTask") || !evidence.excerpt.includes("getToolMsPerTask") || !evidence.excerpt.includes("/1e3")) {
    throw new Error("Missing official AA timing unit evidence");
  }
  if (!Number.isFinite(Date.parse(evidence.captured_at)) || evidence.captured_at.slice(0, 10) !== capturedAt.slice(0, 10)) {
    throw new Error("AA timing unit evidence must be retrieved on the model payload's UTC date");
  }
  const remaining = new Map(evaluationTimingSources.map(source => [source.slug as string, source.url as string]));
  for (const chart of capture.evaluations) {
    const expectedUrl = remaining.get(chart.evaluation_slug);
    if (!expectedUrl || chart.source_url !== expectedUrl) throw new Error(`Unknown, duplicate or mismatched AA timing source: ${chart.evaluation_slug}`);
    remaining.delete(chart.evaluation_slug);
    if (!Number.isFinite(Date.parse(chart.captured_at)) || Date.parse(chart.captured_at) > Date.parse(capturedAt)
      || chart.captured_at.slice(0, 10) !== capturedAt.slice(0, 10)) {
      throw new Error(`${chart.evaluation_slug}: timing chart must be retrieved on the model payload's UTC date`);
    }
    if (chart.unit !== "seconds" || chart.metric_path !== "EvaluationDataProvider.selectedModels[].evalTimePerTask"
      || !chart.title?.trim() || typeof chart.time_chart_present !== "boolean") {
      throw new Error(`${chart.evaluation_slug}: missing timing chart units or source description`);
    }
    const selected = /^(\d+) of (\d+) models$/.exec(chart.selector);
    if (!selected || selected[1] !== selected[2] || Number(selected[1]) === 0) throw new Error(`${chart.evaluation_slug}: not all models selected`);
    if (chart.selected_model_count !== Number(selected[1])) throw new Error(`${chart.evaluation_slug}: selected model payload is incomplete`);
    if (!Array.isArray(chart.items) || !chart.items.length || chart.items.length > Number(selected[1])) throw new Error(`${chart.evaluation_slug}: empty or oversized timing chart`);
    const ids = new Set<string>();
    for (const item of chart.items) {
      if (typeof item.id !== "string" || !item.id.trim() || ids.has(item.id.toLowerCase())) throw new Error(`${chart.evaluation_slug}: missing or duplicate model id`);
      ids.add(item.id.toLowerCase());
      if (typeof item.seconds !== "number" || !Number.isFinite(item.seconds) || item.seconds < 0
        || !item.name?.trim() || !item.url?.startsWith("/models/")) throw new Error(`${chart.evaluation_slug}: invalid timing row ${item.id}`);
    }
  }
  if (remaining.size) throw new Error(`Missing AA evaluation timing payloads: ${[...remaining.keys()].join(", ")}`);
}
