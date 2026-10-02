"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { masterIdentityKey } from "@/lib/master";
import { readModelFavorites, subscribeToModelFavorites, writeModelFavorites } from "@/lib/model-favorites";
import { calculateSuitability, suitabilityTaskSchema, type EvaluationWeight, type SuitabilityTask } from "@/lib/suitability";
import { pinComparison, readSavedTaskSummaries, readSavedTasks, savedComparisonSchema, type PlannerData, type SavedComparison, type SavedTaskSummary } from "@/lib/suitability-storage";
import { readBrowserTasks, saveBrowserTask, removeBrowserTask } from "@/lib/browser-suitability-tasks";
import { recordSuitabilityEvent } from "@/lib/suitability-analytics";
import SuitabilityComparison, { comparisonRows } from "@/components/suitability-comparison";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, FormField, IconButton, Input, LinkButton, PageHeader, Section, Select, Spinner, TextArea } from "@/components/ui/primitives";
import styles from "./suitability-planner.module.css";

const equal = (weights: EvaluationWeight[]) => weights.map(weight => ({ ...weight, weight: 100 / weights.length }));
const niceDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const captureDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value;
const captureDateLabel = (value: string) => {
  const key = captureDateKey(value);
  const date = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};
const captureRange = (weights: EvaluationWeight[]) => {
  const dates = [...new Set(weights.map(weight => captureDateKey(weight.captured_at)))].filter(Boolean).sort();
  if (!dates.length) return "Capture dates unavailable";
  if (dates.length === 1) return captureDateLabel(dates[0]);
  const first = new Date(`${dates[0]}T00:00:00Z`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  if (!Number.isNaN(first.getTime()) && !Number.isNaN(last.getTime())
    && first.getUTCFullYear() === last.getUTCFullYear() && first.getUTCMonth() === last.getUTCMonth()) {
    const month = first.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    return `${first.getUTCDate()}–${last.getUTCDate()} ${month} ${first.getUTCFullYear()}`;
  }
  return `${captureDateLabel(dates[0])}–${captureDateLabel(dates[dates.length - 1])}`;
};

async function saveSharedTask(comparison: SavedComparison) {
  const response = await fetch("/api/suitability/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(comparison),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Task could not be saved to the shared database.");
}

async function fetchSharedTaskSummaries() {
  const response = await fetch("/api/suitability/tasks", { cache: "no-store", signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Shared task request failed (${response.status}).`);
  return readSavedTaskSummaries(JSON.stringify(payload));
}

async function fetchSharedComparison(taskId: string) {
  const response = await fetch(`/api/suitability/tasks?taskId=${encodeURIComponent(taskId)}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Shared task request failed (${response.status}).`);
  return readSavedTasks(JSON.stringify([payload]))[0];
}

function loadErrorMessage(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : "";
  if (/timed out|timeout/i.test(message)) return "The saved task request took too long. Reload and try again.";
  if (/abort/i.test(message)) return "The request was interrupted before the saved tasks loaded. Reload and try again.";
  return message || fallback;
}

function summarizeComparison(comparison: SavedComparison): SavedTaskSummary {
  let preview: SavedTaskSummary["preview"] = null;
  try {
    const leader = comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids)[0];
    if (leader) preview = {
      model_id: leader.model_id,
      model: leader.model,
      provider: leader.provider,
      score: leader.score,
      intelligence_index_cost: leader.intelligence_index_cost ?? null,
    };
  } catch { /* A missing pinned cohort is reported when the comparison is opened. */ }
  return {
    task: {
      id: comparison.task.id,
      title: comparison.task.title,
      request: comparison.task.request,
      evaluation_weights: comparison.task.evaluation_weights,
      created_at: comparison.task.created_at,
      updated_at: comparison.task.updated_at,
    },
    candidate_count: comparison.task.candidate_model_ids.length,
    evaluations: comparison.evaluations,
    preview,
  };
}

function migrateBrowserTask(task: SavedComparison, currentCandidates: PlannerData["candidates"]): SavedComparison {
  const migrated = task.candidates.map(candidate => {
    const identityKey = candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model);
    if (candidate.intelligence_index_cost !== undefined) return { ...candidate, identity_key: identityKey };
    const current = currentCandidates.find(item => item.model_id === candidate.model_id)
      ?? currentCandidates.find(item => item.identity_key === identityKey);
    return { ...candidate, identity_key: identityKey, intelligence_index_cost: current?.intelligence_index_cost ?? null };
  });
  return { ...task, candidates: migrated };
}

function downloadBackup(comparison: SavedComparison) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(savedComparisonSchema.parse(comparison), null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `task-comparison-${comparison.task.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SavedTaskEntry({
  summary,
  shared,
  localComparison,
  loadedComparison,
  detailError,
  loading,
  onLoadComparison,
}: {
  summary: SavedTaskSummary;
  shared: boolean;
  localComparison: SavedComparison | null;
  loadedComparison: SavedComparison | null;
  detailError?: string;
  loading: boolean;
  onLoadComparison: () => Promise<SavedComparison>;
}) {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState("");
  const comparison = shared ? loadedComparison : localComparison;
  const comparisonState = useMemo(() => {
    if (!comparisonOpen || !comparison) return { rows: [] as ReturnType<typeof comparisonRows>, error: "" };
    try { return { rows: comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids), error: "" }; }
    catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : "Pinned comparison data is unavailable." }; }
  }, [comparison, comparisonOpen]);
  const leader = comparisonState.rows[0];
  const preview = summary.preview ?? leader;
  const captureItems = summary.task.evaluation_weights.map(weight => ({
    ...weight,
    displayName: summary.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name ?? weight.evaluation_id,
  }));
  const handleOpen = (open: boolean) => {
    setComparisonOpen(open);
    if (open && shared && !comparison) void onLoadComparison().catch(() => undefined);
  };
  const handleBackup = async () => {
    setBackupError("");
    setBackupLoading(true);
    try {
      const loaded = comparison ?? await onLoadComparison();
      downloadBackup(loaded);
    } catch (cause) {
      setBackupError(loadErrorMessage(cause, "The backup could not be prepared."));
    } finally { setBackupLoading(false); }
  };

  return <Card as="article" className={styles.savedTaskEntry}>
    <div className={styles.taskHeader}>
      <div className={styles.taskHeading}>
        <h2 className={styles.taskTitle}><Link href={`/suitability/${summary.task.id}`}>{summary.task.title}</Link></h2>
        <details className={styles.taskRequest}>
          <summary className={styles.taskDescription}>{summary.task.request}</summary>
        </details>
      </div>
      <Badge className={styles.taskStatus}>{shared ? "Shared" : "This browser"}</Badge>
    </div>

    <div className={styles.taskMeta}>
      <span>Updated <time dateTime={summary.task.updated_at}>{niceDate(summary.task.updated_at)}</time></span>
      <span>{summary.task.evaluation_weights.length} evaluations</span>
      <span>{summary.candidate_count} candidates</span>
      <details className={styles.captureDisclosure}>
        <summary>Pinned captures · {captureRange(summary.task.evaluation_weights)}</summary>
        <ul className={styles.captureList}>
          {captureItems.map(item => <li key={item.evaluation_id}><span>{item.displayName} · {item.weight.toFixed(1)}%</span><time dateTime={item.captured_at}>{captureDateLabel(item.captured_at)}</time></li>)}
        </ul>
      </details>
    </div>

    {preview ? <div className={styles.taskResult} aria-label="Leading candidate result">
      <div className={styles.taskLeading}>
        <p className={styles.taskLabel}>Leading candidate</p>
        <strong className={styles.taskModel}>{preview.model}</strong>
        <span className={styles.taskProvider}>{preview.provider}</span>
      </div>
      <div>
        <p className={styles.taskLabel}>Suitability</p>
        <strong className={styles.taskNumber}>{preview.score === null ? "No score" : preview.score.toFixed(1)}{preview.score !== null && <span className={styles.taskUnit}> / 100</span>}</strong>
      </div>
      <div>
        <p className={styles.taskLabel}>Cost per Intelligence Index task</p>
        {preview.intelligence_index_cost ? <a className={styles.taskCost} href={preview.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${preview.model}`}>
          <strong className={styles.taskNumber}>${preview.intelligence_index_cost.cost_usd.toFixed(2)}</strong> <span className={styles.taskUnit}>USD</span>
        </a> : <strong className={styles.taskNumber}>Unavailable</strong>}
        {preview.intelligence_index_cost && <p className={styles.taskCapture}>Captured {captureDateLabel(preview.intelligence_index_cost.captured_at)}</p>}
      </div>
    </div> : <p className={styles.taskMissingPreview}>Pinned model results are unavailable. Open the comparison to inspect the saved task.</p>}

    <div className={styles.taskActions}>
      <LinkButton variant="secondary" href={`/suitability/${summary.task.id}`}>Open comparison <span aria-hidden="true">↗</span></LinkButton>
      <Button variant="quiet" size="compact" loading={backupLoading} onClick={() => void handleBackup()}>Download backup</Button>
    </div>
    {backupError && <Alert className={styles.taskActionError} tone="error">{backupError}</Alert>}

    <details className={styles.inlineComparison} onToggle={event => handleOpen(event.currentTarget.open)}>
      <summary>Review comparison in place</summary>
      {!comparisonOpen ? null : !comparison && (detailError ? <Alert tone="error"><span>{detailError}</span> <Button size="compact" onClick={() => void onLoadComparison().catch(() => undefined)}>Retry loading comparison</Button></Alert>
        : <p role="status">{loading ? "Loading pinned comparison…" : "Open this section to load the pinned model results."}</p>)}
      {comparisonOpen && comparison && (comparisonState.error ? <Alert tone="error">{comparisonState.error}</Alert> : <SuitabilityComparison data={comparison} rows={comparisonState.rows} />)}
    </details>
  </Card>;
}

export default function Planner({ data }: { data: PlannerData }) {
  const router = useRouter();
  const path = usePathname();
  const isLibrary = path === "/suitability/saved";
  const isReview = path.startsWith("/suitability/") && !isLibrary;
  const taskId = isReview ? path.split("/")[2] : "";
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedTaskSummary[]>([]);
  const [browserSaved, setBrowserSaved] = useState<SavedComparison[]>([]);
  const [active, setActive] = useState<SavedComparison | null>(null);
  const [libraryDetails, setLibraryDetails] = useState<Record<string, SavedComparison>>({});
  const [libraryDetailErrors, setLibraryDetailErrors] = useState<Record<string, string>>({});
  const [libraryLoading, setLibraryLoading] = useState<string[]>([]);
  const [libraryRetry, setLibraryRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [request, setRequest] = useState("");
  const [weights, setWeights] = useState<EvaluationWeight[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [modelMode, setModelMode] = useState<"all" | "favorites">("all");
  const [completeOnly, setCompleteOnly] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncingBrowserSaved, setSyncingBrowserSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const openedPath = useRef("");
  const previousComparison = useRef("");
  const libraryDetailRequests = useRef(new Map<string, Promise<SavedComparison>>());

  useEffect(() => {
    const refresh = () => setFavorites(readModelFavorites());
    refresh();
    return subscribeToModelFavorites(refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (openedPath.current !== path) { recordSuitabilityEvent("planner_opened"); openedPath.current = path; }
    setReady(false); setError(""); setNotice(""); setEditing(false);
    let localTasks: SavedComparison[] = [];
    let localError = "";
    const activate = (activeTask: SavedComparison | null, loadError = "") => {
      if (cancelled) return;
      setActive(activeTask); setTitle(activeTask?.task.title ?? ""); setRequest(activeTask?.task.request ?? "");
      setWeights(activeTask?.task.evaluation_weights ?? []); setSelected(activeTask?.task.candidate_model_ids ?? []);
      setError([loadError, localError].filter(Boolean).join(" "));
      if (activeTask && localTasks.some(task => task === activeTask)) setNotice("Saved in this browser. Shared sync is pending. Download a backup to keep a copy outside this browser.");
      setReady(true);
    };
    void (async () => {
      try {
        const original = await readBrowserTasks();
        localTasks = original.map(task => migrateBrowserTask(task, data.candidates));
        for (let index = 0; index < localTasks.length; index++) {
          if (JSON.stringify(original[index]) !== JSON.stringify(localTasks[index])) await saveBrowserTask(localTasks[index]);
        }
      } catch { localError = "Some browser-saved tasks could not be read or updated. Existing copies have been left untouched."; }
      if (cancelled) return;
      setBrowserSaved(localTasks);
      if (isLibrary) {
        setLibraryDetails({});
        setLibraryDetailErrors({});
        try {
          const summaries = await fetchSharedTaskSummaries();
          if (cancelled) return;
          setSaved(summaries);
          activate(null);
        } catch (cause) {
          if (cancelled) return;
          setSaved([]);
          activate(null, `Shared tasks could not be loaded. ${loadErrorMessage(cause, "The database could not be reached.")}`);
        }
        return;
      }
      if (!taskId) {
        setSaved([]);
        activate(null);
        return;
      }
      const localMatch = localTasks.find(task => task.task.id === taskId) ?? null;
      try {
        const cloudMatch = await fetchSharedComparison(taskId);
        if (cancelled) return;
        const match = localMatch && localMatch.task.updated_at >= cloudMatch.task.updated_at ? localMatch : cloudMatch;
        activate(match);
      } catch (cause) {
        if (cancelled) return;
        activate(localMatch, `Shared task could not be loaded. ${loadErrorMessage(cause, "The database could not be reached.")}`);
      }
    })();
    return () => { cancelled = true; };
  }, [path, data.candidates, taskId, isLibrary, libraryRetry]);

  const loadLibraryComparison = (sharedTaskId: string) => {
    const existing = libraryDetails[sharedTaskId];
    if (existing) return Promise.resolve(existing);
    const pending = libraryDetailRequests.current.get(sharedTaskId);
    if (pending) return pending;
    setLibraryLoading(previous => previous.includes(sharedTaskId) ? previous : [...previous, sharedTaskId]);
    setLibraryDetailErrors(previous => { const next = { ...previous }; delete next[sharedTaskId]; return next; });
    const request = fetchSharedComparison(sharedTaskId).then(comparison => {
      setLibraryDetails(previous => ({ ...previous, [sharedTaskId]: comparison }));
      setLibraryDetailErrors(previous => { const next = { ...previous }; delete next[sharedTaskId]; return next; });
      return comparison;
    }).catch(cause => {
      setLibraryDetailErrors(previous => ({ ...previous, [sharedTaskId]: loadErrorMessage(cause, "The saved comparison could not be loaded.") }));
      throw cause;
    }).finally(() => {
      libraryDetailRequests.current.delete(sharedTaskId);
      setLibraryLoading(previous => previous.filter(id => id !== sharedTaskId));
    });
    libraryDetailRequests.current.set(sharedTaskId, request);
    return request;
  };

  const working = useMemo<PlannerData>(() => {
    if (!active) return data;
    const evaluations = new Map(data.evaluations.map(evaluation => [evaluation.id, evaluation]));
    for (const evaluation of active.evaluations) evaluations.set(evaluation.id, evaluation);
    const candidates = new Map(data.candidates.map(candidate => [candidate.model_id, candidate]));
    for (const candidate of active.candidates) candidates.set(candidate.model_id, candidate);
    const entries = new Map(data.entries.map(entry => [entry.id, entry]));
    for (const entry of active.entries) entries.set(entry.id, entry);
    return { evaluations: [...evaluations.values()], candidates: [...candidates.values()], entries: [...entries.values()],
      availableSnapshotIds: [...new Set([...data.availableSnapshotIds, ...active.availableSnapshotIds])] };
  }, [data, active]);

  const total = weights.reduce((sum, weight) => sum + weight.weight, 0);
  const valid = title.trim().length > 0 && request.trim().length > 0 && weights.length > 0
    && weights.every(weight => Number.isFinite(weight.weight) && weight.weight >= 0)
    && Math.abs(total - 100) <= 0.000001 && selected.length > 0;
  const dirty = !active || active.task.title !== title || active.task.request !== request
    || JSON.stringify(active.task.evaluation_weights) !== JSON.stringify(weights)
    || JSON.stringify(active.task.candidate_model_ids) !== JSON.stringify(selected);
  const result = useMemo(() => {
    if (!valid) return { rows: [], error: "" };
    try { return { rows: calculateSuitability({ ...working, weights, candidates: working.candidates.filter(candidate => selected.includes(candidate.model_id)) }), error: "" }; }
    catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : "Pinned data is unavailable" }; }
  }, [valid, working, weights, selected]);
  useEffect(() => {
    if (!valid || result.error) { previousComparison.current = ""; return; }
    const key = JSON.stringify([weights.map(weight => [weight.evaluation_id, weight.weight, weight.snapshot_id]), [...selected].sort()]);
    if (key !== previousComparison.current) { recordSuitabilityEvent("comparison_calculated"); previousComparison.current = key; }
  }, [valid, weights, selected, result.error]);

  const availableFavorites = data.candidates.filter(candidate => favorites.includes(candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model)));
  const availableFavoriteKeys = new Set(availableFavorites.map(candidate => candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model)));
  const unavailableFavorites = favorites.filter(identity => !availableFavoriteKeys.has(identity));
  const matchesPickerFilters = (candidate: PlannerData["candidates"][number]) => (!provider || candidate.provider === provider)
    && `${candidate.model} ${candidate.provider}`.toLowerCase().includes(modelSearch.toLowerCase());
  const visibleModels = data.candidates.filter(candidate => matchesPickerFilters(candidate)
    && (modelMode === "all" || favorites.includes(candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model))));
  const visibleEvaluations = working.evaluations.filter(evaluation => `${evaluation.display_name} ${evaluation.category} ${evaluation.metric_label}`.toLowerCase().includes(evaluationSearch.toLowerCase()));
  const groups = [...new Set(visibleEvaluations.map(evaluation => evaluation.category))].sort();
  const toggleFavorite = (identity: string) => {
    const next = favorites.includes(identity) ? favorites.filter(value => value !== identity) : [...favorites, identity];
    if (writeModelFavorites(next)) { setFavorites(next); setFavoriteNotice(""); }
    else setFavoriteNotice("Favorites could not be saved in this browser.");
  };
  const toggleEvaluation = (id: string) => {
    const evaluation = working.evaluations.find(item => item.id === id)!;
    recordSuitabilityEvent("evaluations_selected");
    setWeights(equal(weights.some(weight => weight.evaluation_id === id) ? weights.filter(weight => weight.evaluation_id !== id)
      : [...weights, { evaluation_id: id, weight: 0, snapshot_id: evaluation.published_snapshot_id, captured_at: evaluation.captured_at }]));
    setNotice("Evaluation selection changed; weights have been distributed equally.");
  };
  const editWeight = (evaluationId: string, value: string) => {
    const next = weights.map(weight => weight.evaluation_id === evaluationId ? { ...weight, weight: value === "" ? NaN : Number(value) } : weight);
    const nextTotal = next.reduce((sum, weight) => sum + weight.weight, 0);
    const wasValid = Math.abs(total - 100) <= 0.000001 && weights.every(weight => Number.isFinite(weight.weight) && weight.weight >= 0);
    const becomesInvalid = !Number.isFinite(nextTotal) || next.some(weight => !Number.isFinite(weight.weight) || weight.weight < 0) || Math.abs(nextTotal - 100) > 0.000001;
    if (wasValid && becomesInvalid) recordSuitabilityEvent("weight_validation_failed");
    setWeights(next);
  };
  const syncBrowserTasks = async () => {
    if (!browserSaved.length) return;
    setSyncingBrowserSaved(true); setError("");
    try {
      const current = await fetchSharedTaskSummaries();
      const conflicting = browserSaved.filter(task => current.some(shared => shared.task.id === task.task.id && shared.task.updated_at > task.task.updated_at));
      if (conflicting.length) throw new Error("A shared task has newer settings. Your browser copy is retained; download a backup before resolving the difference.");
      for (const task of browserSaved) {
        await saveSharedTask(task);
        const summary = summarizeComparison(task);
        setSaved(previous => [summary, ...previous.filter(item => item.task.id !== task.task.id)]);
        setLibraryDetails(previous => ({ ...previous, [task.task.id]: task }));
        await removeBrowserTask(task);
        setBrowserSaved(previous => previous.filter(item => item.task.id !== task.task.id));
      }
      setNotice("Browser-saved tasks synced to the shared library.");
    } catch (cause) { setError(loadErrorMessage(cause, "Browser-saved tasks could not be added to the shared list.")); }
    finally { setSyncingBrowserSaved(false); }
  };
  const restoreBackup = async (file: File) => {
    try {
      const comparison = migrateBrowserTask(savedComparisonSchema.parse(JSON.parse(await file.text())), data.candidates);
      comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids);
      const existing = browserSaved.find(item => item.task.id === comparison.task.id);
      if (existing && existing.task.updated_at > comparison.task.updated_at) throw new Error("A newer copy is already saved in this browser. The backup was not imported.");
      await saveBrowserTask(comparison);
      setBrowserSaved(previous => [comparison, ...previous.filter(item => item.task.id !== comparison.task.id)]);
      setNotice("Backup imported and saved in this browser. Shared sync is pending."); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The backup could not be imported."); }
  };
  const createComparison = () => {
    const now = new Date().toISOString();
    const task: SuitabilityTask = suitabilityTaskSchema.parse({ id: active?.task.id ?? crypto.randomUUID(), title: title.trim().slice(0, 80), request: request.trim(),
      evaluation_weights: weights, candidate_model_ids: selected, score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
      created_at: active?.task.created_at ?? now, updated_at: now, last_calculated_at: now, schema_version: 1 });
    return pinComparison(task, working);
  };
  const save = async (onlyBrowser = false) => {
    if (!valid || result.error) return;
    setSaving(true); setError("");
    try {
      const pinned = createComparison();
      const task = pinned.task;
      let locallySaved = false;
      let browserError = "";
      try { await saveBrowserTask(pinned); locallySaved = true; }
      catch (cause) { browserError = cause instanceof Error ? cause.message : "Browser storage is unavailable."; }
      if (onlyBrowser && !locallySaved) throw new Error(`The task was not saved. ${browserError}`);
      let sharedSaved = false;
      let sharedError = "";
      if (!onlyBrowser) {
        try { await saveSharedTask(pinned); sharedSaved = true; }
        catch (cause) { sharedError = cause instanceof Error ? cause.message : "Shared saves are unavailable."; }
      }
      if (!locallySaved && !sharedSaved) throw new Error(`The task was not saved. ${browserError} ${sharedError} Your selections are still visible.`);
      if (sharedSaved) {
        setSaved(previous => [summarizeComparison(pinned), ...previous.filter(item => item.task.id !== task.id)]);
        setLibraryDetails(previous => ({ ...previous, [task.id]: pinned }));
        try { await removeBrowserTask(pinned); locallySaved = false; } catch { /* Retain the browser copy if cleanup fails. */ }
      }
      recordSuitabilityEvent("task_saved");
      setActive(pinned);
      setBrowserSaved(previous => locallySaved ? [pinned, ...previous.filter(item => item.task.id !== task.id)] : previous.filter(item => item.task.id !== task.id));
      setNotice(sharedSaved ? "Saved to the shared library." : "Saved in this browser. Shared sync is pending. Download a backup to keep a copy outside this browser.");
      setEditing(false);
      router.replace(`/suitability/${task.id}`, { scroll: false });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Task could not be saved to the shared database. Your current selections are still visible."); }
    finally { setSaving(false); }
  };

  const libraryTasks = useMemo(() => {
    const byId = new Map<string, { summary: SavedTaskSummary; shared: boolean; localComparison: SavedComparison | null }>(
      saved.map(summary => [summary.task.id, { summary, shared: true, localComparison: null }]),
    );
    for (const comparison of browserSaved) {
      const cloud = byId.get(comparison.task.id);
      if (!cloud || comparison.task.updated_at >= cloud.summary.task.updated_at)
        byId.set(comparison.task.id, { summary: summarizeComparison(comparison), shared: false, localComparison: comparison });
    }
    const all = [...byId.values()];
    const query = librarySearch.trim().toLowerCase();
    return all.filter(({ summary }) => !query || `${summary.task.title} ${summary.task.request}`.toLowerCase().includes(query))
      .sort((a, b) => b.summary.task.updated_at.localeCompare(a.summary.task.updated_at));
  }, [saved, browserSaved, librarySearch]);
  const sharedListUnavailable = error.startsWith("Shared tasks could not be loaded.");

  if (!ready) return <div className="ui-loading-state"><Spinner label="Loading saved tasks" /><span>Loading saved tasks…</span></div>;

  if (isLibrary) return <div className={styles.planner}>
    <PageHeader>
      <div className="eyebrow">Task suitability · saved library</div><h1>Saved tasks</h1>
      <p>Shared tasks are visible to everyone who visits this site. Browser saves stay on this device until you sync or download them. Costs are captured Artificial Analysis Intelligence Index task costs, not quotes for your custom task.</p>
    </PageHeader>
    <div className={styles.libraryToolbar}>
      <LinkButton variant="primary" href="/suitability">Create a task</LinkButton>
      <label className={`${styles.searchField} ${styles.librarySearchField}`} htmlFor="saved-task-search">Search saved tasks<Input id="saved-task-search" type="search" value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Search titles or task descriptions" /></label>
      <div className={styles.libraryImport}>
        <label className={styles.libraryImportButton} htmlFor="task-backup">Import backup</label>
        <Input className={styles.visuallyHiddenInput} id="task-backup" aria-label="Import a task backup" type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); event.target.value = ""; }} />
      </div>
    </div>
    {error && <Alert className="workflow-alert" tone="error"><p>{error}</p>{sharedListUnavailable && <Button onClick={() => setLibraryRetry(value => value + 1)}>Reload shared tasks</Button>}</Alert>}
    {browserSaved.length > 0 && <Card className={styles.browserSyncCard}>
      <div className={styles.browserSyncHeader}>
        <div><h2>{browserSaved.length} task{browserSaved.length === 1 ? "" : "s"} saved in this browser</h2><p>Shared sync is pending. Sync {browserSaved.length === 1 ? "it" : "them"} to make {browserSaved.length === 1 ? "it" : "them"} available to everyone who visits this site.</p></div>
        <Button onClick={syncBrowserTasks} disabled={syncingBrowserSaved} loading={syncingBrowserSaved}>Sync to shared library</Button>
      </div>
      <p className={styles.browserSyncNote}>Download a backup before clearing browser data.</p>
    </Card>}
    {libraryTasks.length === 0 ? <Card><EmptyState title={librarySearch ? "No matching saved tasks" : sharedListUnavailable ? "Shared task list unavailable" : "No saved tasks yet"} description={librarySearch ? "Try another title or description." : sharedListUnavailable ? "Try reloading the shared list. Browser-saved copies still appear here when available." : "Save a task comparison to return to its pinned model results later."} action={!librarySearch && !error ? <LinkButton variant="primary" href="/suitability">Create your first task</LinkButton> : undefined} /></Card> : <div className={styles.savedList}>
      {libraryTasks.map(({ summary, shared, localComparison }) => {
        const taskId = summary.task.id;
        const comparison = shared ? libraryDetails[taskId] ?? null : localComparison;
        return <SavedTaskEntry key={summary.task.id} summary={summary} shared={shared} localComparison={localComparison} loadedComparison={comparison}
          detailError={libraryDetailErrors[taskId]} loading={libraryLoading.includes(taskId)} onLoadComparison={() => loadLibraryComparison(taskId)} />;
      })}
    </div>}
    {notice && <Alert className="workflow-alert" tone="info" role="status" live="polite">{notice}</Alert>}
  </div>;

  if (isReview && !editing) {
    if (!active) return <Card><h1>Saved comparison unavailable</h1>{error && <Alert tone="error">{error}</Alert>}<Link href="/suitability/saved">Back to saved tasks</Link></Card>;
    let comparisonError = "";
    let rows = [] as ReturnType<typeof comparisonRows>;
    try { rows = comparisonRows(active, active.task.evaluation_weights, active.task.candidate_model_ids); }
    catch (cause) { comparisonError = cause instanceof Error ? cause.message : "Pinned comparison data is unavailable."; }
    return <div className={styles.planner}>
      <PageHeader>
      <div className="breadcrumb"><Link href="/suitability/saved">Saved tasks</Link> / {active.task.title}</div>
      <div className="eyebrow">Saved comparison</div><h1>{active.task.title}</h1><p>{active.task.request}</p>
      <p>{active.task.evaluation_weights.length} evaluations · {active.task.candidate_model_ids.length} candidates · Updated {niceDate(active.task.updated_at)}</p>
      </PageHeader>
      <div className="toolbar"><Button onClick={() => setEditing(true)}>Edit settings</Button><LinkButton variant="primary" href="/suitability">New task</LinkButton><Link href="/suitability/saved">Saved tasks library</Link></div>
      <Alert className="workflow-alert" tone={browserSaved.some(item => item.task.id === active.task.id && item.task.updated_at >= active.task.updated_at) ? "warning" : "success"} role="status" live="polite">{browserSaved.some(item => item.task.id === active.task.id && item.task.updated_at >= active.task.updated_at) ? "Saved in this browser · shared sync pending. Keep a backup before clearing browser data or switching devices." : "Saved to the shared library."}</Alert>
      <div className="toolbar"><Button onClick={() => downloadBackup(active)}>Download backup</Button>{browserSaved.some(item => item.task.id === active.task.id) && <Button onClick={syncBrowserTasks} disabled={syncingBrowserSaved} loading={syncingBrowserSaved}>Sync browser tasks to shared library</Button>}</div>
      {notice && <Alert className="workflow-alert" tone="info" role="status" live="polite">{notice}</Alert>}
      {error && <Alert className="workflow-alert" tone="error">{error}</Alert>}
      {comparisonError ? <Alert className="workflow-alert" tone="error">{comparisonError}</Alert> : <Card><h2>Model comparison</h2><SuitabilityComparison data={active} rows={rows} /></Card>}
    </div>;
  }

  if (isReview && !active) return <Card><h1>Saved comparison unavailable</h1>{error && <Alert tone="error">{error}</Alert>}<Link href="/suitability/saved">Back to saved tasks</Link></Card>;

  return <div className={styles.planner}>
    <PageHeader>
    <div className="eyebrow">Task suitability · shared saves</div>
    <h1>{active ? `Edit ${active.task.title}` : "Find the best model for a task."}</h1>
    <p>Choose source rankings and priorities, then compare models with transparent coverage and pinned cost context. Browser saves work while shared storage is unavailable and stay on this browser and device.</p>
    </PageHeader>
    <div className="toolbar"><Link href="/suitability/saved">Saved tasks library</Link>{isReview && <Button variant="quiet" onClick={() => setEditing(false)}>Cancel editing</Button>}</div>
    {active?.candidates.some(candidate => !candidate.source_model_ids) && <Alert className="workflow-alert" tone="info">This saved task keeps its original model matching. <Link href="/suitability">Create a new task</Link> to compare models across known alternate sheet labels.</Alert>}
    {error && <Alert className="workflow-alert" tone="error">{error}</Alert>}
    {browserSaved.length > 0 && <Card><h2>Browser-saved tasks</h2><p>{browserSaved.length} task{browserSaved.length === 1 ? " is" : "s are"} saved in this browser with shared sync pending.</p><Button onClick={syncBrowserTasks} disabled={syncingBrowserSaved} loading={syncingBrowserSaved}>Sync browser tasks to shared library</Button></Card>}
    <Card className="ui-workflow-sheet">
      <Section className="ui-workflow-step"><h2>1. Describe the task</h2>
      <div className="ui-form-grid">
        <FormField id="task-title" label="Task title" required>
          <Input maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Analyze company financials" />
        </FormField>
        <FormField id="task-request" label="Task description" required helper="Task text is saved as context. Your evaluations and weights control the score.">
          <TextArea value={request} onChange={event => setRequest(event.target.value)} placeholder="Describe what you need a model to do" rows={3} />
        </FormField>
      </div>
      </Section>
      <Section className="ui-workflow-step"><h2>2. Choose evaluations and weights</h2>
      <div className={`${styles.searchField} ${styles.evaluationSearch}`}><label htmlFor="evaluation-search">Search evaluations</label><Input id="evaluation-search" type="search" placeholder="Search by evaluation or metric" value={evaluationSearch} onChange={event => setEvaluationSearch(event.target.value)} /></div>
      <div className={styles.picker}>{groups.map(category => <fieldset key={category}><legend>{category.replaceAll("_", " ")}</legend>
        {visibleEvaluations.filter(evaluation => evaluation.category === category).map(evaluation => <label className={styles.option} key={evaluation.id}>
          <Checkbox checked={weights.some(weight => weight.evaluation_id === evaluation.id)} onChange={() => toggleEvaluation(evaluation.id)} />
          <span><strong>{evaluation.display_name}</strong><small>{evaluation.metric_label} · {evaluation.row_count} ranked rows · {evaluation.captured_at}</small></span></label>)}
      </fieldset>)}{visibleEvaluations.length === 0 && <p>No evaluations match.</p>}</div>
      <div className="toolbar"><Button onClick={() => setWeights(equal(weights))} disabled={!weights.length}>Equal weights</Button><strong aria-live="polite">Total: {Number.isFinite(total) ? total.toFixed(2) : "Invalid"}%</strong></div>
      {weights.map(weight => <div className={styles.weight} key={weight.evaluation_id}><label htmlFor={`weight-${weight.evaluation_id}`}>{working.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name}</label>
        <Input id={`weight-${weight.evaluation_id}`} type="number" min="0" max="100" step="any" value={Number.isFinite(weight.weight) ? weight.weight : ""} onChange={event => editWeight(weight.evaluation_id, event.target.value)} /><span>%</span></div>)}
      <p>Weights must total 100%. Adding or removing an evaluation resets equal weights.</p></Section>
      <Section className="ui-workflow-step"><h2>3. Select candidate models</h2><p className={styles.modelDescription}>Models are grouped by known alternate labels. Reasoning effort and fallback variants stay separate.</p>
      <div className={styles.modelToolbar}>
        <div className={styles.modelFilterFields}>
          <label className={`${styles.searchField} ${styles.modelSearchField}`} htmlFor="model-search">Search models<Input id="model-search" type="search" placeholder="Search model names or providers" value={modelSearch} onChange={event => setModelSearch(event.target.value)} /></label>
          <label className={styles.searchField} htmlFor="provider-filter">Provider<Select id="provider-filter" value={provider} onChange={event => setProvider(event.target.value)}><option value="">All providers</option>{[...new Set(working.candidates.map(candidate => candidate.provider))].sort().map(item => <option key={item}>{item}</option>)}</Select></label>
          <label className={styles.searchField} htmlFor="model-favorites">Show<Select id="model-favorites" value={modelMode} onChange={event => setModelMode(event.target.value as "all" | "favorites")}><option value="all">All models</option><option value="favorites">Favorites</option></Select></label>
        </div>
        <div className={styles.modelStatus} aria-live="polite"><span>{visibleModels.length.toLocaleString()} models</span><span aria-hidden="true">·</span><span>{availableFavorites.length} favorites</span><span aria-hidden="true">·</span><span>{selected.length} selected</span></div>
      </div>
      <div className={styles.modelActions}>
        <div className={styles.modelActionGroup}><span className={styles.modelActionLabel}>Selection</span><Button onClick={() => setSelected([...new Set([...selected, ...visibleModels.map(candidate => candidate.model_id)])])}>Select visible</Button>
          <Button variant="quiet" onClick={() => { const visible = new Set(visibleModels.map(candidate => candidate.model_id)); setSelected(selected.filter(id => !visible.has(id))); }}>Deselect visible</Button></div>
        <div className={`${styles.modelActionGroup} ${styles.modelActionGroupFavorites}`}><span className={styles.modelActionLabel}>Favorites</span><Button onClick={() => setSelected([...new Set([...selected, ...availableFavorites.map(candidate => candidate.model_id)])])} disabled={!availableFavorites.length}>Add favorites</Button>
          <Button variant="quiet" onClick={() => setSelected(availableFavorites.map(candidate => candidate.model_id))} disabled={!availableFavorites.length}>Replace with favorites</Button></div>
      </div>
      {unavailableFavorites.length > 0 && <Alert tone="info" role="status">{unavailableFavorites.length} favorited model{unavailableFavorites.length === 1 ? " is" : "s are"} unavailable in the current candidate catalog. They remain in your favorites; no substitute was selected.</Alert>}
      {favoriteNotice && <Alert tone="error" role="status" live="polite">{favoriteNotice}</Alert>}
      <div className={styles.chips}>{working.candidates.filter(candidate => selected.includes(candidate.model_id)).map(candidate => <Button key={candidate.model_id} size="compact" variant="quiet" aria-label={`Remove ${candidate.model}, ${candidate.provider}`} onClick={() => setSelected(selected.filter(id => id !== candidate.model_id))}>{candidate.model} · {candidate.provider} ×</Button>)}</div>
      <div className={styles.picker}>{visibleModels.map(candidate => {
        const identity = candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model);
        const isFavorite = favorites.includes(identity);
        return <div className={styles.candidateOption} key={candidate.model_id}><Checkbox aria-label={`Select ${candidate.model}, ${candidate.provider}`} checked={selected.includes(candidate.model_id)} onChange={event => setSelected(event.target.checked ? [...selected, candidate.model_id] : selected.filter(id => id !== candidate.model_id))} />
          <span><strong>{candidate.model}</strong><small>{candidate.provider}</small></span>
          <IconButton className={styles.favoriteStar} variant="quiet" type="button" aria-pressed={isFavorite} aria-label={`${isFavorite ? "Remove" : "Add"} ${candidate.model} to favorites`} onClick={() => toggleFavorite(identity)}>{isFavorite ? "★" : "☆"}</IconButton>
        </div>;
      })}{!visibleModels.length && <p>No models match this view. <Link href="/">Visit the master leaderboard to build a favorites list.</Link></p>}</div>
      </Section>
      <Section className="ui-workflow-step"><h2>4. Save and compare</h2><p>{request.trim() || "Describe your task above."}</p><p>{weights.length} evaluations · {selected.length} candidates · rank_percentile_v1</p>
      <ul>{weights.map(weight => <li key={weight.evaluation_id}>{working.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name}: {Number.isFinite(weight.weight) ? weight.weight.toFixed(2) : "Invalid"}% · snapshot {weight.captured_at}</li>)}</ul>
      {!valid && <p>Enter a title and description, choose at least one evaluation and candidate, and assign nonnegative weights totaling 100%.</p>}
      {result.error && <Alert tone="error">{result.error}</Alert>}
      <div className="toolbar"><Button variant="primary" loading={saving} onClick={() => void save()} disabled={!valid || !!result.error || saving}>{active ? "Save settings and update comparison" : "Save task and compare models"}</Button><Button onClick={() => void save(true)} disabled={!valid || !!result.error || saving}>Save in this browser</Button><Button onClick={() => downloadBackup(createComparison())} disabled={!valid || !!result.error || saving}>Download backup</Button></div>
      {notice && <Alert tone="info" role="status" live="polite">{notice}</Alert>}</Section>
    </Card>
    {valid && !result.error && <Card><h2>Model comparison preview</h2><p>{dirty ? "Preview of unsaved settings. Save to keep this configuration." : `Saved comparison · calculated ${active?.task.last_calculated_at}`}</p>
      <SuitabilityComparison data={working} rows={result.rows} completeOnly={completeOnly} onCompleteOnlyChange={setCompleteOnly} />
    </Card>}
    <Section id="methodology" className="prose"><h2>How suitability works</h2><p>Each source rank becomes a 0–100 component: 100 × (1 − (rank − 1) / max(1, cohort size − 1)), clamped to 0–100. Suitability averages these components using your weights. Higher is better. Weighted average source rank uses the same available weights; lower is better.</p><p>Missing entries stay “Not ranked” and are excluded from the average. Coverage shows the selected weight with a rank. Complete weight coverage sorts first. Cost is shown as separate context and is not used in the score.</p><p>Saved tasks preserve their full source cohorts and capture dates. New imports do not change saved results or pinned costs. Source links open the currently published leaderboards, which may have newer ranks. <Link href="/about/data">Read the data notes</Link>.</p></Section>
  </div>;
}
