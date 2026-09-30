"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { masterIdentityKey } from "@/lib/master";
import { readModelFavorites, subscribeToModelFavorites, writeModelFavorites } from "@/lib/model-favorites";
import { calculateSuitability, suitabilityTaskSchema, type EvaluationWeight, type SuitabilityTask } from "@/lib/suitability";
import { pinComparison, readSavedTasks, TASK_STORAGE_KEY, type PlannerData, type SavedComparison } from "@/lib/suitability-storage";
import { recordSuitabilityEvent } from "@/lib/suitability-analytics";
import SuitabilityComparison, { comparisonRows } from "@/components/suitability-comparison";
import styles from "./suitability-planner.module.css";

const equal = (weights: EvaluationWeight[]) => weights.map(weight => ({ ...weight, weight: 100 / weights.length }));
const niceDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function saveSharedTask(comparison: SavedComparison) {
  const response = await fetch("/api/suitability/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(comparison),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Task could not be saved to the shared database.");
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

function writeBrowserTasks(tasks: SavedComparison[]) {
  try {
    if (tasks.length) localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    else localStorage.removeItem(TASK_STORAGE_KEY);
  } catch { /* Shared database saves remain available when browser storage is blocked. */ }
}

export default function Planner({ data }: { data: PlannerData }) {
  const router = useRouter();
  const path = usePathname();
  const isLibrary = path === "/suitability/saved";
  const isReview = path.startsWith("/suitability/") && !isLibrary;
  const taskId = isReview ? path.split("/")[2] : "";
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedComparison[]>([]);
  const [browserSaved, setBrowserSaved] = useState<SavedComparison[]>([]);
  const [active, setActive] = useState<SavedComparison | null>(null);
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
    try {
      localTasks = readSavedTasks(localStorage.getItem(TASK_STORAGE_KEY)).map(task => migrateBrowserTask(task, data.candidates));
      writeBrowserTasks(localTasks);
    } catch { localError = "Browser-saved tasks could not be read. They have been left untouched."; }
    setBrowserSaved(localTasks);
    const activate = (sharedTasks: SavedComparison[], loadError = "") => {
      if (cancelled) return;
      const match = taskId ? sharedTasks.find(task => task.task.id === taskId) ?? localTasks.find(task => task.task.id === taskId) : null;
      const sharedMatch = sharedTasks.some(task => task.task.id === taskId);
      setSaved(sharedTasks); setActive(match ?? null); setTitle(match?.task.title ?? ""); setRequest(match?.task.request ?? "");
      setWeights(match?.task.evaluation_weights ?? []); setSelected(match?.task.candidate_model_ids ?? []);
      setError([loadError, localError || (taskId && !match ? "This task is not saved in the shared list or this browser." : "")].filter(Boolean).join(" "));
      if (!loadError && taskId && match && !sharedMatch) setNotice("This task is only saved in this browser. Saving it will add it to the shared list.");
      setReady(true);
    };
    void (async () => {
      try {
        const response = await fetch("/api/suitability/tasks", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Shared tasks could not be loaded.");
        activate(readSavedTasks(JSON.stringify(payload)));
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : "The database could not be reached.";
        activate([], `Shared tasks could not be loaded. ${detail}`);
      }
    })();
    return () => { cancelled = true; };
  }, [path, data.candidates, taskId]);

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
      const existingIds = new Set(saved.map(task => task.task.id));
      const toUpload = browserSaved.filter(task => !existingIds.has(task.task.id));
      for (const task of toUpload) await saveSharedTask(task);
      const synced = [...toUpload, ...saved];
      setSaved(synced); writeBrowserTasks([]); setBrowserSaved([]);
      setNotice(`Added ${toUpload.length} browser-saved task${toUpload.length === 1 ? "" : "s"} to the shared list.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Browser-saved tasks could not be added to the shared list."); }
    finally { setSyncingBrowserSaved(false); }
  };
  const save = async () => {
    if (!valid || result.error) return;
    setSaving(true); setError("");
    try {
      const now = new Date().toISOString();
      const task: SuitabilityTask = suitabilityTaskSchema.parse({ id: active?.task.id ?? crypto.randomUUID(), title: title.trim().slice(0, 80), request: request.trim(),
        evaluation_weights: weights, candidate_model_ids: selected, score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
        created_at: active?.task.created_at ?? now, updated_at: now, last_calculated_at: now, schema_version: 1 });
      const pinned = pinComparison(task, working);
      await saveSharedTask(pinned);
      const tasks = [pinned, ...saved.filter(item => item.task.id !== task.id)];
      recordSuitabilityEvent("task_saved");
      setSaved(tasks); setActive(pinned); setBrowserSaved(browserSaved.filter(item => item.task.id !== task.id));
      writeBrowserTasks(browserSaved.filter(item => item.task.id !== task.id));
      setNotice("Task settings and pinned evaluation and cost snapshots saved to the shared database.");
      setEditing(false);
      router.replace(`/suitability/${task.id}`, { scroll: false });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Task could not be saved to the shared database. Your current selections are still visible."); }
    finally { setSaving(false); }
  };

  const libraryTasks = useMemo(() => {
    const sharedIds = new Set(saved.map(task => task.task.id));
    const all = [...saved.map(task => ({ comparison: task, shared: true })), ...browserSaved.filter(task => !sharedIds.has(task.task.id)).map(comparison => ({ comparison, shared: false }))];
    const query = librarySearch.trim().toLowerCase();
    return all.filter(({ comparison }) => !query || `${comparison.task.title} ${comparison.task.request}`.toLowerCase().includes(query))
      .sort((a, b) => b.comparison.task.updated_at.localeCompare(a.comparison.task.updated_at));
  }, [saved, browserSaved, librarySearch]);

  if (!ready) return <p>Loading saved tasks…</p>;

  if (isLibrary) return <div className={styles.planner}>
    <div className="eyebrow">Task suitability · saved library</div><h1>Saved tasks</h1>
    <p>Shared tasks are visible to everyone who visits this site. Favorites stay in this browser. Cost per Intelligence Index task is the Artificial Analysis weighted average for one Index task, not the price of the task description here.</p>
    <div className="toolbar"><Link className={styles.primaryLink} href="/suitability">Create a task</Link><label className={styles.searchField} htmlFor="saved-task-search">Search saved tasks<input id="saved-task-search" type="search" value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Search titles or task descriptions" /></label></div>
    {error && <p role="alert" className="panel error">{error}</p>}
    {browserSaved.length > 0 && <section className="panel"><p>{browserSaved.length} older task{browserSaved.length === 1 ? " is" : "s are"} saved only in this browser. Add them to the shared library to make them available to everyone.</p><button onClick={syncBrowserTasks} disabled={syncingBrowserSaved}>{syncingBrowserSaved ? "Adding tasks…" : "Add browser-saved tasks to shared list"}</button></section>}
    {libraryTasks.length === 0 ? <section className="panel"><h2>{librarySearch ? "No matching saved tasks" : "No saved tasks yet"}</h2><p>{librarySearch ? "Try another title or description." : "Save a task comparison to return to its pinned model results later."}</p>{!librarySearch && <Link href="/suitability">Create your first task →</Link>}</section> : <div className={styles.savedList}>
      {libraryTasks.map(({ comparison, shared }) => {
        let rows = [] as ReturnType<typeof comparisonRows>;
        let comparisonError = "";
        try { rows = comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids); }
        catch (cause) { comparisonError = cause instanceof Error ? cause.message : "Pinned comparison data is unavailable."; }
        const leader = rows[0];
        return <article className="panel" key={comparison.task.id}>
          <div className="toolbar"><div><h2>{comparison.task.title}</h2><p>{comparison.task.request}</p></div><span className={styles.badge}>{shared ? "Shared" : "This browser"}</span></div>
          <dl className={styles.taskMeta}><div><dt>Last updated</dt><dd>{niceDate(comparison.task.updated_at)}</dd></div><div><dt>Evaluations</dt><dd>{comparison.task.evaluation_weights.length}</dd></div><div><dt>Candidates</dt><dd>{comparison.task.candidate_model_ids.length}</dd></div></dl>
          <p className={styles.captureList}><strong>Pinned captures:</strong> {comparison.task.evaluation_weights.map(weight => `${comparison.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name ?? weight.evaluation_id} · ${weight.captured_at}`).join("; ")}</p>
          {leader ? <p><strong>Leading candidate:</strong> {leader.model} · suitability {leader.score === null ? "No score" : leader.score.toFixed(1)} · Cost per Intelligence Index task {leader.intelligence_index_cost ? `$${leader.intelligence_index_cost.cost_usd.toFixed(2)} · captured ${niceDate(leader.intelligence_index_cost.captured_at)}` : "—"}</p> : comparisonError ? <p role="alert">{comparisonError}</p> : <p>No comparison candidates are available.</p>}
          <div className="toolbar"><Link href={`/suitability/${comparison.task.id}`}>Open comparison</Link></div>
          <details><summary>Review comparison in place</summary>{comparisonError ? <p role="alert">{comparisonError}</p> : <SuitabilityComparison data={comparison} rows={rows} />}</details>
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
      {error && <p role="alert" className="panel error">{error}</p>}
      {comparisonError ? <p role="alert" className="panel error">{comparisonError}</p> : <section className="panel"><h2>Model comparison</h2><SuitabilityComparison data={active} rows={rows} /></section>}
    </div>;
  }

  if (isReview && !active) return <section className="panel"><h1>Saved comparison unavailable</h1>{error && <p role="alert">{error}</p>}<Link href="/suitability/saved">Back to saved tasks</Link></section>;

  return <div className={styles.planner}>
    <div className="eyebrow">Task suitability · shared saves</div>
    <h1>{active ? `Edit ${active.task.title}` : "Find the best model for a task."}</h1>
    <p>Choose source rankings and priorities, then compare models with transparent coverage and pinned cost context.</p>
    <div className="toolbar"><Link href="/suitability/saved">Saved tasks library</Link>{isReview && <button onClick={() => setEditing(false)}>Cancel editing</button>}</div>
    {active?.candidates.some(candidate => !candidate.source_model_ids) && <p className="panel">This saved task keeps its original model matching. <Link href="/suitability">Create a new task</Link> to compare models across known alternate sheet labels.</p>}
    {error && <p role="alert" className="panel error">{error}</p>}
    {browserSaved.length > 0 && <section className="panel"><h2>Browser-saved tasks</h2><p>{browserSaved.length} older task{browserSaved.length === 1 ? " is" : "s are"} saved only in this browser.</p><button onClick={syncBrowserTasks} disabled={syncingBrowserSaved}>{syncingBrowserSaved ? "Adding tasks…" : "Add browser-saved tasks to shared list"}</button></section>}
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
      <button className={styles.primary} onClick={save} disabled={!valid || !!result.error || saving}>{saving ? "Saving to shared database…" : active ? "Save settings and update comparison" : "Save task and compare models"}</button>
      <p role="status">{notice}</p></section>
    {valid && !result.error && <section className="panel"><h2>Model comparison preview</h2><p>{dirty ? "Preview of unsaved settings. Save to keep this configuration." : `Saved comparison · calculated ${active?.task.last_calculated_at}`}</p>
      <SuitabilityComparison data={working} rows={result.rows} completeOnly={completeOnly} onCompleteOnlyChange={setCompleteOnly} />
    </section>}
    <section className="panel" id="methodology"><h2>How suitability works</h2><p>Each source rank becomes a 0–100 component: 100 × (1 − (rank − 1) / max(1, cohort size − 1)), clamped to 0–100. Suitability averages these components using your weights. Higher is better. Weighted average source rank uses the same available weights; lower is better.</p><p>Missing entries stay “Not ranked” and are excluded from the average. Coverage shows the selected weight with a rank. Complete weight coverage sorts first. Cost is shown as separate context and is not used in the score.</p><p>Saved tasks preserve their full source cohorts and capture dates. New imports do not change saved results or pinned costs. Source links open the currently published leaderboards, which may have newer ranks. <Link href="/about/data">Read the data notes</Link>.</p></section>
  </div>;
}
