"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateSuitability, suitabilityTaskSchema, type EvaluationWeight, type SuitabilityTask } from "@/lib/suitability";
import { pinComparison, readSavedTasks, TASK_STORAGE_KEY, type PlannerData, type SavedComparison } from "@/lib/suitability-storage";
import { recordSuitabilityEvent } from "@/lib/suitability-analytics";
import styles from "./suitability-planner.module.css";

const number = (value: number | null) => value === null ? "No score" : value.toFixed(1);
const equal = (weights: EvaluationWeight[]) => weights.map(w => ({ ...w, weight: 100 / weights.length }));

export default function Planner({ data }: { data: PlannerData }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedComparison[]>([]);
  const [active, setActive] = useState<SavedComparison | null>(null);
  const [request, setRequest] = useState("");
  const [weights, setWeights] = useState<EvaluationWeight[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [completeOnly, setCompleteOnly] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const openedPath = useRef("");
  const previousComparison = useRef("");
  useEffect(() => {
    if (openedPath.current !== path) { recordSuitabilityEvent("planner_opened"); openedPath.current = path; }
    try {
      const tasks = readSavedTasks(localStorage.getItem(TASK_STORAGE_KEY));
      setSaved(tasks);
      const taskId = path.split("/")[2];
      const match = tasks.find(t => t.task.id === taskId);
      setActive(match ?? null); setRequest(match?.task.request ?? "");
      setWeights(match?.task.evaluation_weights ?? []); setSelected(match?.task.candidate_model_ids ?? []);
      setError(taskId && !match ? "This task is not saved in this browser. You can create a new task below." : "");
    } catch {
      setError("Saved tasks could not be read. Browser storage may be unavailable or contain an unsupported task. Existing storage will not be overwritten.");
    }
    setReady(true);
  }, [path]);

  const working = useMemo<PlannerData>(() => {
    if (!active) return data;
    const evaluations = new Map(data.evaluations.map(e => [e.id, e]));
    for (const e of active.evaluations) evaluations.set(e.id, e);
    const candidates = new Map(data.candidates.map(c => [c.model_id, c]));
    for (const c of active.candidates) candidates.set(c.model_id, c);
    const entries = new Map(data.entries.map(e => [e.id, e]));
    for (const e of active.entries) entries.set(e.id, e);
    return { evaluations: [...evaluations.values()], candidates: [...candidates.values()], entries: [...entries.values()],
      availableSnapshotIds: [...new Set([...data.availableSnapshotIds, ...active.availableSnapshotIds])] };
  }, [data, active]);
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  const valid = request.trim().length > 0 && weights.length > 0 && weights.every(w => Number.isFinite(w.weight) && w.weight >= 0)
    && Math.abs(total - 100) <= 0.000001 && selected.length > 0;
  const dirty = !active || active.task.request !== request || JSON.stringify(active.task.evaluation_weights) !== JSON.stringify(weights)
    || JSON.stringify(active.task.candidate_model_ids) !== JSON.stringify(selected);
  const result = useMemo(() => {
    if (!valid) return { rows: [], error: "" };
    try {
      return { rows: calculateSuitability({ ...working, weights, candidates: working.candidates.filter(c => selected.includes(c.model_id)) }), error: "" };
    } catch (e) { return { rows: [], error: e instanceof Error ? e.message : "Pinned data is unavailable" }; }
  }, [valid, working, weights, selected]);
  useEffect(() => {
    if (!valid || result.error) { previousComparison.current = ""; return; }
    const key = JSON.stringify([weights.map(w => [w.evaluation_id, w.weight, w.snapshot_id]), [...selected].sort()]);
    if (key !== previousComparison.current) {
      recordSuitabilityEvent("comparison_calculated");
      previousComparison.current = key;
    }
  }, [valid, weights, selected, result.error]);
  const visibleModels = working.candidates.filter(c => (!provider || c.provider === provider)
    && `${c.model} ${c.provider}`.toLowerCase().includes(modelSearch.toLowerCase()));
  const visibleEvaluations = working.evaluations.filter(e => `${e.display_name} ${e.category} ${e.metric_label}`.toLowerCase().includes(evaluationSearch.toLowerCase()));
  const groups = [...new Set(visibleEvaluations.map(e => e.category))].sort();
  const toggleEvaluation = (id: string) => {
    const e = working.evaluations.find(e => e.id === id)!;
    recordSuitabilityEvent("evaluations_selected");
    setWeights(equal(weights.some(w => w.evaluation_id === id) ? weights.filter(w => w.evaluation_id !== id)
      : [...weights, { evaluation_id: id, weight: 0, snapshot_id: e.published_snapshot_id, captured_at: e.captured_at }]));
    setNotice("Evaluation selection changed; weights have been distributed equally.");
  };
  const editWeight = (evaluationId: string, value: string) => {
    const next = weights.map(w => w.evaluation_id === evaluationId ? { ...w, weight: value === "" ? NaN : Number(value) } : w);
    const nextTotal = next.reduce((sum, w) => sum + w.weight, 0);
    const wasValid = Math.abs(total - 100) <= 0.000001 && weights.every(w => Number.isFinite(w.weight) && w.weight >= 0);
    const becomesInvalid = !Number.isFinite(nextTotal) || next.some(w => !Number.isFinite(w.weight) || w.weight < 0) || Math.abs(nextTotal - 100) > 0.000001;
    if (wasValid && becomesInvalid) recordSuitabilityEvent("weight_validation_failed");
    setWeights(next);
  };
  const save = () => {
    if (!valid || result.error) return;
    try {
      // Re-read before writing so other tabs' saved tasks are preserved.
      const existing = readSavedTasks(localStorage.getItem(TASK_STORAGE_KEY));
      const now = new Date().toISOString();
      const task: SuitabilityTask = suitabilityTaskSchema.parse({ id: active?.task.id ?? crypto.randomUUID(), title: request.trim().slice(0, 80), request,
        evaluation_weights: weights, candidate_model_ids: selected, score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
        created_at: active?.task.created_at ?? now, updated_at: now, last_calculated_at: now, schema_version: 1 });
      const pinned = pinComparison(task, working);
      const tasks = [pinned, ...existing.filter(t => t.task.id !== task.id)];
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
      recordSuitabilityEvent("task_saved");
      setSaved(tasks); setActive(pinned); setError(""); setNotice("Task and pinned snapshot data saved in this browser.");
      router.replace(`/suitability/${task.id}`, { scroll: false });
    } catch { setError("Task could not be saved. Browser storage may be full, unavailable, or contain unsupported tasks. Your current selections are still visible."); }
  };
  if (!ready) return <p>Loading your saved tasks…</p>;
  return <div className={styles.planner}>
    <div className="eyebrow">Task suitability · browser beta</div>
    <h1>Find the best model for a task.</h1>
    <p>Choose the source rankings and priorities that matter to you. Saved tasks stay in this browser, with their snapshot data pinned.</p>
    {active?.candidates.some(c => !c.source_model_ids) && <p className="panel">This saved task keeps its original model matching. <Link href="/suitability">Create a new task</Link> to compare models across known alternate sheet labels.</p>}
    {error && <p role="alert" className="panel error">{error}</p>}
    {saved.length > 0 && <section className="panel"><h2>Saved tasks</h2><div className="toolbar"><Link href="/suitability">New task</Link>{saved.map(s => <Link key={s.task.id} href={`/suitability/${s.task.id}`} aria-current={active?.task.id === s.task.id ? "page" : undefined}>{s.task.title}</Link>)}</div></section>}
    <section className="panel"><h2>1. Describe the task</h2><label htmlFor="task-request">What do you need a model to do?</label>
      <textarea id="task-request" value={request} onChange={e => setRequest(e.target.value)} placeholder="Ask for stock analysis" rows={3} />
      <p>Task text is saved as context. Your evaluations and weights control the score.</p></section>
    <section className="panel"><h2>2. Choose evaluations and weights</h2>
      <label htmlFor="evaluation-search">Search evaluations</label><input id="evaluation-search" value={evaluationSearch} onChange={e => setEvaluationSearch(e.target.value)} />
      <div className={styles.picker}>{groups.map(category => <fieldset key={category}><legend>{category.replaceAll("_", " ")}</legend>
        {visibleEvaluations.filter(e => e.category === category).map(e => <label className={styles.option} key={e.id}>
          <input type="checkbox" checked={weights.some(w => w.evaluation_id === e.id)} onChange={() => toggleEvaluation(e.id)} />
          <span><strong>{e.display_name}</strong><small>{e.metric_label} · {e.row_count} ranked rows · {e.captured_at}</small></span></label>)}
      </fieldset>)}{visibleEvaluations.length === 0 && <p>No evaluations match.</p>}</div>
      <div className="toolbar"><button onClick={() => setWeights(equal(weights))} disabled={!weights.length}>Equal weights</button><strong aria-live="polite">Total: {Number.isFinite(total) ? total.toFixed(2) : "Invalid"}%</strong></div>
      {weights.map(w => <div className={styles.weight} key={w.evaluation_id}><label htmlFor={`weight-${w.evaluation_id}`}>{working.evaluations.find(e => e.id === w.evaluation_id)?.display_name}</label>
        <input id={`weight-${w.evaluation_id}`} type="number" min="0" max="100" step="any" value={Number.isFinite(w.weight) ? w.weight : ""} onChange={e => editWeight(w.evaluation_id, e.target.value)} /><span>%</span></div>)}
      <p>Weights must total 100%. Adding or removing an evaluation resets equal weights.</p></section>
    <section className="panel"><h2>3. Select candidate models</h2><p>Known alternate sheet labels match the same model. Reasoning effort and fallback variants remain separate.</p><div className="toolbar">
      <label>Search models<input value={modelSearch} onChange={e => setModelSearch(e.target.value)} /></label>
      <label>Provider<select value={provider} onChange={e => setProvider(e.target.value)}><option value="">All providers</option>{[...new Set(working.candidates.map(c => c.provider))].sort().map(p => <option key={p}>{p}</option>)}</select></label>
      <button onClick={() => setSelected([...new Set([...selected, ...visibleModels.map(c => c.model_id)])])}>Select all visible</button>
      <button onClick={() => { const visible = new Set(visibleModels.map(c => c.model_id)); setSelected(selected.filter(id => !visible.has(id))); }}>Clear visible</button>
      <strong aria-live="polite">{selected.length} selected · {visibleModels.length} visible</strong></div>
      <div className={styles.chips}>{working.candidates.filter(c => selected.includes(c.model_id)).map(c => <button key={c.model_id} aria-label={`Remove ${c.model}, ${c.provider}`} onClick={() => setSelected(selected.filter(id => id !== c.model_id))}>{c.model} · {c.provider} ×</button>)}</div>
      <div className={styles.picker}>{visibleModels.map(c => <label className={styles.option} key={c.model_id}><input type="checkbox" checked={selected.includes(c.model_id)} onChange={e => setSelected(e.target.checked ? [...selected, c.model_id] : selected.filter(id => id !== c.model_id))} /><span>{c.model}<small>{c.provider}</small></span></label>)}{!visibleModels.length && <p>No models match.</p>}</div>
    </section>
    <section className="panel"><h2>4. Save and compare</h2><p>{request.trim() || "Describe your task above."}</p><p>{weights.length} evaluations · {selected.length} candidates · rank_percentile_v1</p>
      <ul>{weights.map(w => <li key={w.evaluation_id}>{working.evaluations.find(e => e.id === w.evaluation_id)?.display_name}: {Number.isFinite(w.weight) ? w.weight.toFixed(2) : "Invalid"}% · snapshot {w.captured_at}</li>)}</ul>
      {!valid && <p>Enter a task, choose at least one evaluation and candidate, and assign nonnegative weights totaling 100%.</p>}
      {result.error && <p role="alert">{result.error}</p>}
      <button className={styles.primary} onClick={save} disabled={!valid || !!result.error}>Save task and compare models</button>
      <p role="status">{notice}</p></section>
    {valid && !result.error && <section className="panel"><h2>Model comparison</h2><p>{dirty ? "Preview of unsaved changes. Save to keep this configuration." : `Saved comparison · calculated ${active?.task.last_calculated_at}`}</p>
      <label className={styles.option}><input type="checkbox" checked={completeOnly} onChange={e => { setCompleteOnly(e.target.checked); if (e.target.checked) recordSuitabilityEvent("complete_coverage_filter_used"); }} />Complete coverage only</label>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Suitability results, scroll horizontally for all evaluations"><table className={styles.results}><thead><tr><th>Model / provider</th><th>Suitability ↑</th><th>Coverage</th><th>Weighted average rank ↓</th>{weights.map(w => <th key={w.evaluation_id}>{working.evaluations.find(e => e.id === w.evaluation_id)?.display_name}</th>)}</tr></thead>
        <tbody>{result.rows.filter(r => !completeOnly || r.complete_coverage).map(r => <tr key={r.model_id}><td><strong>{r.model}</strong><small>{r.provider}</small><details onToggle={e => { if (e.currentTarget.open) recordSuitabilityEvent("result_breakdown_opened"); }}><summary>Calculation breakdown</summary><div className={styles.breakdown}>{r.breakdown.map(b => <div key={b.evaluation_id}><Link onClick={() => recordSuitabilityEvent("source_leaderboard_opened")} href={`/leaderboards/${working.evaluations.find(e => e.id === b.evaluation_id)?.slug}?q=${encodeURIComponent(b.source_model ?? r.model)}`}>{working.evaluations.find(e => e.id === b.evaluation_id)?.display_name} →</Link><p>Weight {b.weight.toFixed(2)}% · rank {b.source_rank ?? "Not ranked"} · cohort {b.cohort_size}<br />Component {number(b.component_score)} · contribution {b.contribution === null ? "None" : `${number(b.contribution)} points`}<br />Captured {b.captured_at}{b.scoring_status && <><br />{b.scoring_status}</>}</p></div>)}</div></details></td>
          <td>{number(r.score)}{!r.complete_coverage && <small>partial</small>}</td><td>{r.ranked_evaluations} of {r.selected_evaluations} evaluations · {r.coverage_percent.toFixed(1)}% weight</td><td>{r.weighted_average_rank === null ? "No rank" : number(r.weighted_average_rank)}</td>{r.breakdown.map(b => <td key={b.evaluation_id}>{b.source_rank ?? "Not ranked"}{b.scoring_status && <small>{b.scoring_status}</small>}</td>)}</tr>)}</tbody></table></div>
      {completeOnly && !result.rows.some(r => r.complete_coverage) && <p>No candidates have complete weight coverage.</p>}
    </section>}
    <section className="panel" id="methodology"><h2>How suitability works</h2><p>Each source rank becomes a 0–100 component: 100 × (1 − (rank − 1) / max(1, cohort size − 1)), clamped to 0–100. Suitability averages these components using your weights. Higher is better. Weighted average source rank uses the same available weights; lower is better.</p><p>Missing entries stay “Not ranked” and are excluded from the average. Coverage shows the selected weight with a rank. Complete weight coverage sorts first. Rank 5 and rank 20 in two 100-row cohorts, equally weighted, yield average rank 12.5 and suitability 88.4.</p><p>Saved tasks preserve their full source cohorts and capture dates in this browser. New imports do not change saved results. Source links open the currently published leaderboards, which may have newer ranks. <Link href="/about/data">Read the data notes</Link>.</p></section>
  </div>;
}
