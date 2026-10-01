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
import styles from "./suitability-planner.module.css";

const equal = (weights: EvaluationWeight[]) => weights.map(weight => ({ ...weight, weight: 100 / weights.length }));
const niceDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
  const matchingFavorites = data.candidates.filter(candidate => favorites.includes(candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model)) && matchesPickerFilters(candidate));
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

  if (!ready) return <p>Loading saved tasks…</p>;

  if (isLibrary) return <div className={styles.planner}>
    <div className="eyebrow">Task suitability · saved library</div><h1>Saved tasks</h1>
    <p>Shared tasks are visible to everyone who visits this site. Favorites stay in this browser. Cost per Intelligence Index task is the Artificial Analysis weighted average for one Index task, not the price of the task description here.</p>
    <div className="toolbar"><Link className={styles.primaryLink} href="/suitability">Create a task</Link><label className={styles.searchField} htmlFor="saved-task-search">Search saved tasks<input id="saved-task-search" type="search" value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Search titles or task descriptions" /></label></div>
    {error && <div role="alert" className="panel error"><p>{error}</p>{sharedListUnavailable && <button onClick={() => setLibraryRetry(value => value + 1)}>Reload shared tasks</button>}</div>}
    <div className="toolbar"><label htmlFor="task-backup">Import a task backup<input id="task-backup" type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); event.target.value = ""; }} /></label></div>
    {browserSaved.length > 0 && <section className="panel"><p>{browserSaved.length} task{browserSaved.length === 1 ? " is" : "s are"} saved in this browser with shared sync pending. They reopen here after a reload. Download backups before clearing browser data or switching devices.</p><button onClick={syncBrowserTasks} disabled={syncingBrowserSaved}>{syncingBrowserSaved ? "Syncing tasks…" : "Sync browser tasks to shared library"}</button><p>Syncing makes these tasks visible to everyone who visits the site.</p></section>}
    {libraryTasks.length === 0 ? <section className="panel"><h2>{librarySearch ? "No matching saved tasks" : sharedListUnavailable ? "Shared task list unavailable" : "No saved tasks yet"}</h2><p>{librarySearch ? "Try another title or description." : sharedListUnavailable ? "Try reloading the shared list. Browser-saved copies still appear here when available." : "Save a task comparison to return to its pinned model results later."}</p>{!librarySearch && !error && <Link href="/suitability">Create your first task →</Link>}</section> : <div className={styles.savedList}>
      {libraryTasks.map(({ summary, shared, localComparison }) => {
        const taskId = summary.task.id;
        const comparison = shared ? libraryDetails[taskId] ?? null : localComparison;
        let rows = [] as ReturnType<typeof comparisonRows>;
        let comparisonError = "";
        if (comparison) try { rows = comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids); }
        catch (cause) { comparisonError = cause instanceof Error ? cause.message : "Pinned comparison data is unavailable."; }
        const leader = rows[0];
        const preview = summary.preview;
        return <article className="panel" key={summary.task.id}>
          <div className="toolbar"><div><h2>{summary.task.title}</h2><p>{summary.task.request}</p></div><span className={styles.badge}>{shared ? "Shared" : "This browser"}</span></div>
          <dl className={styles.taskMeta}><div><dt>Last updated</dt><dd>{niceDate(summary.task.updated_at)}</dd></div><div><dt>Evaluations</dt><dd>{summary.task.evaluation_weights.length}</dd></div><div><dt>Candidates</dt><dd>{summary.candidate_count}</dd></div></dl>
          <p className={styles.captureList}><strong>Pinned captures:</strong> {summary.task.evaluation_weights.map(weight => `${summary.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name ?? weight.evaluation_id} · ${weight.captured_at}`).join("; ")}</p>
          {preview ? <p><strong>Leading candidate:</strong> {preview.model} · suitability {preview.score === null ? "No score" : preview.score.toFixed(1)} · Cost per Intelligence Index task {preview.intelligence_index_cost ? `$${preview.intelligence_index_cost.cost_usd.toFixed(2)} · captured ${niceDate(preview.intelligence_index_cost.captured_at)}` : "—"}</p>
            : leader ? <p><strong>Leading candidate:</strong> {leader.model} · suitability {leader.score === null ? "No score" : leader.score.toFixed(1)} · Cost per Intelligence Index task {leader.intelligence_index_cost ? `$${leader.intelligence_index_cost.cost_usd.toFixed(2)} · captured ${niceDate(leader.intelligence_index_cost.captured_at)}` : "—"}</p>
              : comparisonError ? <p role="alert">{comparisonError}</p> : <p>Open the comparison to load its pinned model results.</p>}
          {libraryDetailErrors[taskId] && <p role="alert">{libraryDetailErrors[taskId]}</p>}
          <div className="toolbar"><Link href={`/suitability/${taskId}`}>Open comparison</Link><button disabled={shared && libraryLoading.includes(taskId)} onClick={() => {
            if (comparison) downloadBackup(comparison);
            else void loadLibraryComparison(taskId).then(downloadBackup).catch(() => undefined);
          }}>{shared && libraryLoading.includes(taskId) ? "Loading backup…" : "Download backup"}</button></div>
          <details onToggle={event => { if (shared && event.currentTarget.open && !comparison) void loadLibraryComparison(taskId).catch(() => undefined); }}>
            <summary>Review comparison in place</summary>
            {!comparison && (libraryDetailErrors[taskId]
              ? <div><p role="alert">{libraryDetailErrors[taskId]}</p><button onClick={() => void loadLibraryComparison(taskId).catch(() => undefined)}>Retry loading comparison</button></div>
              : <p role="status">{libraryLoading.includes(taskId) ? "Loading pinned comparison…" : "Open this section to load the pinned model results."}</p>)}
            {comparison && (comparisonError ? <p role="alert">{comparisonError}</p> : <SuitabilityComparison data={comparison} rows={rows} />)}
          </details>
        </article>;
      })}
    </div>}
    <p role="status">{notice}</p>
  </div>;

  if (isReview && !editing) {
    if (!active) return <section className="panel"><h1>Saved comparison unavailable</h1>{error && <p role="alert">{error}</p>}<Link href="/suitability/saved">Back to saved tasks</Link></section>;
    let comparisonError = "";
    let rows = [] as ReturnType<typeof comparisonRows>;
    try { rows = comparisonRows(active, active.task.evaluation_weights, active.task.candidate_model_ids); }
    catch (cause) { comparisonError = cause instanceof Error ? cause.message : "Pinned comparison data is unavailable."; }
    return <div className={styles.planner}>
      <div className="breadcrumb"><Link href="/suitability/saved">Saved tasks</Link> / {active.task.title}</div>
      <div className="eyebrow">Saved comparison</div><h1>{active.task.title}</h1><p>{active.task.request}</p>
      <p>{active.task.evaluation_weights.length} evaluations · {active.task.candidate_model_ids.length} candidates · Updated {niceDate(active.task.updated_at)}</p>
      <div className="toolbar"><button onClick={() => setEditing(true)}>Edit settings</button><Link className={styles.primaryLink} href="/suitability">New task</Link><Link href="/suitability/saved">Saved tasks library</Link></div>
      <p role="status">{browserSaved.some(item => item.task.id === active.task.id && item.task.updated_at >= active.task.updated_at) ? "Saved in this browser · shared sync pending. Keep a backup before clearing browser data or switching devices." : "Saved to the shared library."}</p>
      <div className="toolbar"><button onClick={() => downloadBackup(active)}>Download backup</button>{browserSaved.some(item => item.task.id === active.task.id) && <button onClick={syncBrowserTasks} disabled={syncingBrowserSaved}>{syncingBrowserSaved ? "Syncing tasks…" : "Sync browser tasks to shared library"}</button>}</div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert" className="panel error">{error}</p>}
      {comparisonError ? <p role="alert" className="panel error">{comparisonError}</p> : <section className="panel"><h2>Model comparison</h2><SuitabilityComparison data={active} rows={rows} /></section>}
    </div>;
  }

  if (isReview && !active) return <section className="panel"><h1>Saved comparison unavailable</h1>{error && <p role="alert">{error}</p>}<Link href="/suitability/saved">Back to saved tasks</Link></section>;

  return <div className={styles.planner}>
    <div className="eyebrow">Task suitability · shared saves</div>
    <h1>{active ? `Edit ${active.task.title}` : "Find the best model for a task."}</h1>
    <p>Choose source rankings and priorities, then compare models with transparent coverage and pinned cost context. Browser saves work while shared storage is unavailable and stay on this browser and device.</p>
    <div className="toolbar"><Link href="/suitability/saved">Saved tasks library</Link>{isReview && <button onClick={() => setEditing(false)}>Cancel editing</button>}</div>
    {active?.candidates.some(candidate => !candidate.source_model_ids) && <p className="panel">This saved task keeps its original model matching. <Link href="/suitability">Create a new task</Link> to compare models across known alternate sheet labels.</p>}
    {error && <p role="alert" className="panel error">{error}</p>}
    {browserSaved.length > 0 && <section className="panel"><h2>Browser-saved tasks</h2><p>{browserSaved.length} task{browserSaved.length === 1 ? " is" : "s are"} saved in this browser with shared sync pending.</p><button onClick={syncBrowserTasks} disabled={syncingBrowserSaved}>{syncingBrowserSaved ? "Syncing tasks…" : "Sync browser tasks to shared library"}</button></section>}
    <section className="panel"><h2>1. Describe the task</h2>
      <label htmlFor="task-title">Task title</label><input id="task-title" maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Analyze company financials" />
      <label htmlFor="task-request">Task description</label><textarea id="task-request" value={request} onChange={event => setRequest(event.target.value)} placeholder="Describe what you need a model to do" rows={3} />
      <p>Task text is saved as context. Your evaluations and weights control the score.</p></section>
    <section className="panel"><h2>2. Choose evaluations and weights</h2>
      <div className={`${styles.searchField} ${styles.evaluationSearch}`}><label htmlFor="evaluation-search">Search evaluations</label><input id="evaluation-search" type="search" placeholder="Search by evaluation or metric" value={evaluationSearch} onChange={event => setEvaluationSearch(event.target.value)} /></div>
      <div className={styles.picker}>{groups.map(category => <fieldset key={category}><legend>{category.replaceAll("_", " ")}</legend>
        {visibleEvaluations.filter(evaluation => evaluation.category === category).map(evaluation => <label className={styles.option} key={evaluation.id}>
          <input type="checkbox" checked={weights.some(weight => weight.evaluation_id === evaluation.id)} onChange={() => toggleEvaluation(evaluation.id)} />
          <span><strong>{evaluation.display_name}</strong><small>{evaluation.metric_label} · {evaluation.row_count} ranked rows · {evaluation.captured_at}</small></span></label>)}
      </fieldset>)}{visibleEvaluations.length === 0 && <p>No evaluations match.</p>}</div>
      <div className="toolbar"><button onClick={() => setWeights(equal(weights))} disabled={!weights.length}>Equal weights</button><strong aria-live="polite">Total: {Number.isFinite(total) ? total.toFixed(2) : "Invalid"}%</strong></div>
      {weights.map(weight => <div className={styles.weight} key={weight.evaluation_id}><label htmlFor={`weight-${weight.evaluation_id}`}>{working.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name}</label>
        <input id={`weight-${weight.evaluation_id}`} type="number" min="0" max="100" step="any" value={Number.isFinite(weight.weight) ? weight.weight : ""} onChange={event => editWeight(weight.evaluation_id, event.target.value)} /><span>%</span></div>)}
      <p>Weights must total 100%. Adding or removing an evaluation resets equal weights.</p></section>
    <section className="panel"><h2>3. Select candidate models</h2><p>Known alternate sheet labels match the same model. Reasoning effort and fallback variants remain separate.</p>
      <div className={`${styles.modelToolbar} ${styles.toolbarReset}`}>
        <label className={styles.searchField} htmlFor="model-search">Search models<input id="model-search" type="search" placeholder="Search model names or providers" value={modelSearch} onChange={event => setModelSearch(event.target.value)} /></label>
        <label className={styles.searchField} htmlFor="provider-filter">Provider<select id="provider-filter" value={provider} onChange={event => setProvider(event.target.value)}><option value="">All providers</option>{[...new Set(working.candidates.map(candidate => candidate.provider))].sort().map(item => <option key={item}>{item}</option>)}</select></label>
        <label className={styles.searchField} htmlFor="model-favorites">Candidate view<select id="model-favorites" value={modelMode} onChange={event => setModelMode(event.target.value as "all" | "favorites")}><option value="all">All models</option><option value="favorites">Favorites</option></select></label>
        <button onClick={() => setSelected([...new Set([...selected, ...visibleModels.map(candidate => candidate.model_id)])])}>Select all visible</button>
        <button onClick={() => { const visible = new Set(visibleModels.map(candidate => candidate.model_id)); setSelected(selected.filter(id => !visible.has(id))); }}>Clear visible</button>
        <strong className={styles.selectionCount} aria-live="polite">{availableFavorites.length} favorites available · {matchingFavorites.length} match filters · {selected.length} candidates selected</strong>
      </div>
      <div className="toolbar"><button onClick={() => setSelected([...new Set([...selected, ...availableFavorites.map(candidate => candidate.model_id)])])} disabled={!availableFavorites.length}>Add all favorites</button>
        <button onClick={() => setSelected(availableFavorites.map(candidate => candidate.model_id))} disabled={!availableFavorites.length}>Replace selection with all favorites</button>
        <span>{visibleModels.length} models shown</span></div>
      {unavailableFavorites.length > 0 && <p role="status">{unavailableFavorites.length} favorited model{unavailableFavorites.length === 1 ? " is" : "s are"} unavailable in the current candidate catalog. They remain in your favorites; no substitute was selected.</p>}
      {favoriteNotice && <p role="status">{favoriteNotice}</p>}
      <div className={styles.chips}>{working.candidates.filter(candidate => selected.includes(candidate.model_id)).map(candidate => <button key={candidate.model_id} aria-label={`Remove ${candidate.model}, ${candidate.provider}`} onClick={() => setSelected(selected.filter(id => id !== candidate.model_id))}>{candidate.model} · {candidate.provider} ×</button>)}</div>
      <div className={styles.picker}>{visibleModels.map(candidate => {
        const identity = candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model);
        const isFavorite = favorites.includes(identity);
        return <div className={styles.candidateOption} key={candidate.model_id}><input aria-label={`Select ${candidate.model}, ${candidate.provider}`} type="checkbox" checked={selected.includes(candidate.model_id)} onChange={event => setSelected(event.target.checked ? [...selected, candidate.model_id] : selected.filter(id => id !== candidate.model_id))} />
          <span><strong>{candidate.model}</strong><small>{candidate.provider}</small></span>
          <button className={styles.favoriteStar} type="button" aria-pressed={isFavorite} aria-label={`${isFavorite ? "Remove" : "Add"} ${candidate.model} to favorites`} onClick={() => toggleFavorite(identity)}>{isFavorite ? "★" : "☆"}</button>
        </div>;
      })}{!visibleModels.length && <p>No models match this view. <Link href="/">Visit the master leaderboard to build a favorites list.</Link></p>}</div>
    </section>
    <section className="panel"><h2>4. Save and compare</h2><p>{request.trim() || "Describe your task above."}</p><p>{weights.length} evaluations · {selected.length} candidates · rank_percentile_v1</p>
      <ul>{weights.map(weight => <li key={weight.evaluation_id}>{working.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name}: {Number.isFinite(weight.weight) ? weight.weight.toFixed(2) : "Invalid"}% · snapshot {weight.captured_at}</li>)}</ul>
      {!valid && <p>Enter a title and description, choose at least one evaluation and candidate, and assign nonnegative weights totaling 100%.</p>}
      {result.error && <p role="alert">{result.error}</p>}
      <div className="toolbar"><button className={styles.primary} onClick={() => void save()} disabled={!valid || !!result.error || saving}>{saving ? "Saving comparison…" : active ? "Save settings and update comparison" : "Save task and compare models"}</button><button onClick={() => void save(true)} disabled={!valid || !!result.error || saving}>Save in this browser</button><button onClick={() => downloadBackup(createComparison())} disabled={!valid || !!result.error || saving}>Download backup</button></div>
      <p role="status">{notice}</p></section>
    {valid && !result.error && <section className="panel"><h2>Model comparison preview</h2><p>{dirty ? "Preview of unsaved settings. Save to keep this configuration." : `Saved comparison · calculated ${active?.task.last_calculated_at}`}</p>
      <SuitabilityComparison data={working} rows={result.rows} completeOnly={completeOnly} onCompleteOnlyChange={setCompleteOnly} />
    </section>}
    <section className="panel" id="methodology"><h2>How suitability works</h2><p>Each source rank becomes a 0–100 component: 100 × (1 − (rank − 1) / max(1, cohort size − 1)), clamped to 0–100. Suitability averages these components using your weights. Higher is better. Weighted average source rank uses the same available weights; lower is better.</p><p>Missing entries stay “Not ranked” and are excluded from the average. Coverage shows the selected weight with a rank. Complete weight coverage sorts first. Cost is shown as separate context and is not used in the score.</p><p>Saved tasks preserve their full source cohorts and capture dates. New imports do not change saved results or pinned costs. Source links open the currently published leaderboards, which may have newer ranks. <Link href="/about/data">Read the data notes</Link>.</p></section>
  </div>;
}
