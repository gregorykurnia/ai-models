"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { masterIdentityKey } from "@/lib/master";
import { readModelFavorites, subscribeToModelFavorites, writeModelFavorites } from "@/lib/model-favorites";
import { calculateSuitability, suitabilityTaskSchema, type EvaluationWeight, type SuitabilityTask } from "@/lib/suitability";
import { pinComparison, readSavedTaskSummaries, readSavedTasks, savedComparisonSchema, suitabilityCategorySchema, type PlannerData, type SavedComparison, type SavedTaskSummary, type SuitabilityCategory } from "@/lib/suitability-storage";
import { groupSavedTaskIds, normalizeCategoryName } from "@/lib/suitability-categories";
import { emptySavedTaskLayout, SAVED_TASK_LAYOUT_STORAGE_KEY, savedTaskLayoutSchema, type SavedTaskLayout, type SavedTaskLayoutOperation } from "@/lib/suitability-layout";
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

async function saveSharedTask(comparison: SavedComparison): Promise<{ revision: number; categoryName: string | null }> {
  const response = await fetch("/api/suitability/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(comparison),
    signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Task could not be saved to the shared database.");
  return { revision: Number(payload.category_revision ?? comparison.category_revision ?? 0), categoryName: typeof payload.category_name === "string" ? payload.category_name : null };
}

async function fetchSharedTaskSummaries() {
  const response = await fetch("/api/suitability/tasks", { cache: "no-store", signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Shared task request failed (${response.status}).`);
  return readSavedTaskSummaries(JSON.stringify(payload));
}

async function fetchCategories(): Promise<SuitabilityCategory[]> {
  const response = await fetch("/api/suitability/categories", { cache: "no-store", signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Category request failed (${response.status}).`);
  return suitabilityCategorySchema.array().parse(payload);
}

async function fetchSharedTaskLayout(): Promise<SavedTaskLayout> {
  const response = await fetch("/api/suitability/layout", { cache: "no-store", signal: AbortSignal.timeout(30000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Saved task layout request failed (${response.status}).`);
  return savedTaskLayoutSchema.parse(payload);
}

async function saveSharedTaskLayout(operation: SavedTaskLayoutOperation): Promise<SavedTaskLayout> {
  const response = await fetch("/api/suitability/layout", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation), signal: AbortSignal.timeout(30000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Saved task layout could not be updated.");
  return savedTaskLayoutSchema.parse(payload);
}

function readLocalTaskLayout(): SavedTaskLayout {
  if (typeof window === "undefined") return emptySavedTaskLayout();
  try {
    const raw = localStorage.getItem(SAVED_TASK_LAYOUT_STORAGE_KEY);
    if (!raw) return emptySavedTaskLayout();
    const parsed = JSON.parse(raw) as unknown;
    const result = savedTaskLayoutSchema.safeParse({ revision: 0, categories: (parsed as { categories?: unknown })?.categories ?? parsed });
    return result.success ? { revision: 0, categories: result.data.categories } : emptySavedTaskLayout();
  } catch { return emptySavedTaskLayout(); }
}

function writeLocalTaskLayout(layout: SavedTaskLayout) {
  try { localStorage.setItem(SAVED_TASK_LAYOUT_STORAGE_KEY, JSON.stringify({ revision: 0, categories: layout.categories })); }
  catch { /* Browser storage is optional; shared layout remains authoritative when available. */ }
}

function layoutCategoryId(categoryId: string | null) {
  return categoryId ?? "__uncategorized__";
}

async function createCategory(name: string): Promise<SuitabilityCategory> {
  const response = await fetch("/api/suitability/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Category could not be created.");
  return suitabilityCategorySchema.parse(payload);
}

async function renameCategory(id: string, name: string): Promise<SuitabilityCategory> {
  const response = await fetch(`/api/suitability/categories/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Category could not be renamed.");
  return suitabilityCategorySchema.parse(payload);
}

async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`/api/suitability/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Category could not be deleted.");
}

async function assignSharedTaskCategory(taskId: string, categoryId: string | null, expectedRevision: number) {
  const response = await fetch(`/api/suitability/tasks/${encodeURIComponent(taskId)}/category`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId, expected_revision: expectedRevision }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "The task category could not be changed.");
  return payload as { category_id: string | null; category_name: string | null; category_revision: number; updated_at: string };
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
    const rows = comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids);
    const previewRow = (comparison.task.implementor_model_id
      ? rows.find(row => row.model_id === comparison.task.implementor_model_id)
      : null) ?? rows[0];
    if (previewRow) preview = {
      model_id: previewRow.model_id,
      model: previewRow.model,
      provider: previewRow.provider,
      score: previewRow.score,
      intelligence_index_cost: previewRow.intelligence_index_cost ?? null,
    };
  } catch { /* A missing pinned cohort is reported when the comparison is opened. */ }
  return {
    task: {
      id: comparison.task.id,
      title: comparison.task.title,
      request: comparison.task.request,
      evaluation_weights: comparison.task.evaluation_weights,
      implementor_model_id: comparison.task.implementor_model_id ?? null,
      created_at: comparison.task.created_at,
      updated_at: comparison.task.updated_at,
      category_id: comparison.category_id ?? null,
      category_name: comparison.category_name ?? null,
      category_revision: comparison.category_revision ?? 0,
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
  return { ...task, category_id: task.category_id ?? null, category_name: task.category_name ?? null,
    category_revision: task.category_revision ?? 0, candidates: migrated };
}

function downloadBackup(comparison: SavedComparison) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(savedComparisonSchema.parse(comparison), null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `task-comparison-${comparison.task.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function currentCategoryBackup(comparison: SavedComparison, categories: SuitabilityCategory[], categoriesLoaded: boolean): SavedComparison {
  if (!categoriesLoaded) return comparison;
  const category = categories.find(item => item.id === comparison.category_id);
  return { ...comparison, category_id: category?.id ?? null, category_name: category?.name ?? null };
}

type ComparisonRow = ReturnType<typeof comparisonRows>[number];

function SelectedModelDetails({ rows, selectedModelId, onSelect, implementorModelId, implementorSaving, onChooseImplementor }: {
  rows: ComparisonRow[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  implementorModelId: string | null;
  implementorSaving: boolean;
  onChooseImplementor: () => void;
}) {
  const selected = rows.find(row => row.model_id === selectedModelId)
    ?? rows.find(row => row.model_id === implementorModelId)
    ?? rows[0];
  if (!selected) return null;
  const isImplementor = selected.model_id === implementorModelId;

  return <section className={styles.modelDetails} aria-label="Selected model details">
    <div className={styles.modelDetailsHeader}>
      <div>
        <p className={styles.taskLabel}>Selected model</p>
        <h3>Model details</h3>
        <p className={styles.modelDetailsHint}>Choose a model to inspect its result and evidence at a glance.</p>
      </div>
      <label className={styles.modelDetailsPicker}>Model
        <Select aria-label="Model details" value={selected.model_id} onChange={event => onSelect(event.target.value)}>
          {rows.map(row => <option key={row.model_id} value={row.model_id}>{row.model} · {row.provider}</option>)}
        </Select>
      </label>
    </div>

    <div className={styles.modelDetailsActions}>
      <Button variant={isImplementor ? "quiet" : "primary"} size="compact" disabled={isImplementor} loading={implementorSaving} aria-pressed={isImplementor} onClick={onChooseImplementor}>
        {isImplementor ? "Chosen implementor" : "Choose as implementor"}
      </Button>
      <span className={styles.modelDetailsActionNote} aria-live="polite">{isImplementor ? "Shown in the saved task card." : "This model will appear in the saved task card."}</span>
    </div>

    <div className={styles.modelDetailsGrid} aria-live="polite">
      <div className={styles.modelDetailsIdentity}>
        <p className={styles.taskLabel}>Model</p>
        <strong className={styles.taskModel}>{selected.model}</strong>
        <span className={styles.taskProvider}>{selected.provider}</span>
      </div>
      <div>
        <p className={styles.taskLabel}>Suitability</p>
        <strong className={styles.taskNumber}>{selected.score === null ? "No score" : selected.score.toFixed(1)}{selected.score !== null && <span className={styles.taskUnit}> / 100</span>}</strong>
      </div>
      <div>
        <p className={styles.taskLabel}>Coverage</p>
        <strong className={styles.modelDetailsValue}>{selected.ranked_evaluations} of {selected.selected_evaluations}</strong>
        <span className={styles.modelDetailsMeta}>{selected.coverage_percent.toFixed(1)}% weight ranked</span>
      </div>
      <div>
        <p className={styles.taskLabel}>Weighted average rank</p>
        <strong className={styles.modelDetailsValue}>{selected.weighted_average_rank === null ? "No rank" : selected.weighted_average_rank.toFixed(1)}</strong>
        <span className={styles.modelDetailsMeta}>Lower is better</span>
      </div>
      <div>
        <p className={styles.taskLabel}>Cost per Intelligence Index task</p>
        {selected.intelligence_index_cost ? <a className={styles.taskCost} href={selected.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${selected.model}`}>
          <strong className={styles.modelDetailsValue}>${selected.intelligence_index_cost.cost_usd.toFixed(2)}</strong> <span className={styles.taskUnit}>USD</span>
        </a> : <strong className={styles.modelDetailsValue}>Unavailable</strong>}
        {selected.intelligence_index_cost && <span className={styles.modelDetailsMeta}>Captured {captureDateLabel(selected.intelligence_index_cost.captured_at)}</span>}
      </div>
    </div>
  </section>;
}

function SavedTaskEntry({
  summary,
  shared,
  localComparison,
  loadedComparison,
  detailError,
  loading,
  onLoadComparison,
  categories,
  categoriesLoaded,
  categoryLabel,
  onAssignCategory,
  onSetImplementor,
  returnTo,
  canMoveUp,
  canMoveDown,
  reorderDisabled,
  onMove,
}: {
  summary: SavedTaskSummary;
  shared: boolean;
  localComparison: SavedComparison | null;
  loadedComparison: SavedComparison | null;
  detailError?: string;
  loading: boolean;
  onLoadComparison: () => Promise<SavedComparison>;
  categories: SuitabilityCategory[];
  categoriesLoaded: boolean;
  categoryLabel: string;
  onAssignCategory: (categoryId: string | null) => Promise<void>;
  onSetImplementor: (modelId: string) => Promise<void>;
  returnTo: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  reorderDisabled: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [categoryId, setCategoryId] = useState(summary.task.category_id ?? "");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [implementorSaving, setImplementorSaving] = useState(false);
  const [implementorError, setImplementorError] = useState("");
  const comparison = shared ? loadedComparison : localComparison;
  const comparisonState = useMemo(() => {
    if (!comparisonOpen || !comparison) return { rows: [] as ReturnType<typeof comparisonRows>, error: "" };
    try { return { rows: comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids), error: "" }; }
    catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : "Pinned comparison data is unavailable." }; }
  }, [comparison, comparisonOpen]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const implementorModelId = comparison?.task.implementor_model_id ?? summary.task.implementor_model_id ?? null;
  const leader = comparisonState.rows[0];
  const selectedComparisonModel = comparisonState.rows.find(row => row.model_id === selectedModelId)
    ?? comparisonState.rows.find(row => row.model_id === implementorModelId)
    ?? leader;
  const preview = summary.preview ?? leader;
  const previewLabel = implementorModelId ? "Chosen implementor" : "Leading candidate";
  const captureItems = summary.task.evaluation_weights.map(weight => ({
    ...weight,
    displayName: summary.evaluations.find(evaluation => evaluation.id === weight.evaluation_id)?.display_name ?? weight.evaluation_id,
  }));
  const handleOpen = (open: boolean) => {
    setComparisonOpen(open);
    if (open && shared && !comparison) void onLoadComparison().catch(() => undefined);
  };
  useEffect(() => {
    if (categoriesLoaded) setCategoryId(categories.some(category => category.id === summary.task.category_id) ? summary.task.category_id ?? "" : "");
  }, [summary.task.category_id, categories, categoriesLoaded]);
  const handleBackup = async () => {
    setBackupError("");
    setBackupLoading(true);
    try {
      const loaded = comparison ?? await onLoadComparison();
      downloadBackup(currentCategoryBackup(loaded, categories, categoriesLoaded));
    } catch (cause) {
      setBackupError(loadErrorMessage(cause, "The backup could not be prepared."));
    } finally { setBackupLoading(false); }
  };
  const handleCategoryChange = async (nextId: string) => {
    setCategoryId(nextId);
    setCategoryError("");
    setCategorySaving(true);
    try { await onAssignCategory(nextId || null); }
    catch (cause) {
      setCategoryId(summary.task.category_id ?? "");
      setCategoryError(cause instanceof Error ? cause.message : "The task category could not be changed.");
    } finally { setCategorySaving(false); }
  };
  const handleChooseImplementor = async () => {
    const modelId = selectedComparisonModel?.model_id;
    if (!modelId || modelId === implementorModelId) return;
    setImplementorError("");
    setImplementorSaving(true);
    try { await onSetImplementor(modelId); }
    catch (cause) { setImplementorError(cause instanceof Error ? cause.message : "The implementor could not be saved."); }
    finally { setImplementorSaving(false); }
  };

  return <Card as="article" className={styles.savedTaskEntry}>
    <div className={styles.taskHeader}>
      <div className={styles.taskHeading}>
        <h2 className={styles.taskTitle}><Link href={`/suitability/${summary.task.id}?returnTo=${encodeURIComponent(returnTo)}`}>{summary.task.title}</Link></h2>
        <details className={styles.taskRequest}>
          <summary className={styles.taskDescription}>{summary.task.request}</summary>
        </details>
      </div>
      <Badge className={styles.taskStatus}>{shared ? "Shared" : "This browser"}</Badge>
    </div>

    <div className={styles.taskMeta}>
      <span className={styles.taskCategory}>{categoryLabel}</span>
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

    {preview && !(comparisonOpen && comparisonState.rows.length > 0) ? <div className={styles.taskResult} aria-label={`${previewLabel} result`}>
      <div className={styles.taskLeading}>
        <p className={styles.taskLabel}>{previewLabel}</p>
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
      <LinkButton variant="secondary" href={`/suitability/${summary.task.id}?returnTo=${encodeURIComponent(returnTo)}`}>Open comparison <span aria-hidden="true">↗</span></LinkButton>
      <Button variant="quiet" size="compact" loading={backupLoading} onClick={() => void handleBackup()}>Download backup</Button>
      <label className={styles.categoryPicker}>Change category<Select aria-label={`Category for ${summary.task.title}`} value={categoryId} disabled={categorySaving || !categoriesLoaded} onChange={event => void handleCategoryChange(event.target.value)}>
        <option value="">Uncategorized</option>{categoryId && !categories.some(category => category.id === categoryId) && <option value={categoryId}>Category unavailable</option>}{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </Select></label>
      <div className={styles.taskReorder} aria-label={`Reorder ${summary.task.title}`}>
        <span>Order</span>
        <IconButton aria-label={`Move ${summary.task.title} up`} disabled={reorderDisabled || !canMoveUp} onClick={() => onMove("up")}><span aria-hidden="true">↑</span></IconButton>
        <IconButton aria-label={`Move ${summary.task.title} down`} disabled={reorderDisabled || !canMoveDown} onClick={() => onMove("down")}><span aria-hidden="true">↓</span></IconButton>
      </div>
    </div>
    {categoryError && <Alert className={styles.taskActionError} tone="error">{categoryError}</Alert>}
    {backupError && <Alert className={styles.taskActionError} tone="error">{backupError}</Alert>}
    {implementorError && <Alert className={styles.taskActionError} tone="error">{implementorError}</Alert>}

    <details className={styles.inlineComparison} onToggle={event => handleOpen(event.currentTarget.open)}>
      <summary>Review comparison in place</summary>
      {!comparisonOpen ? null : !comparison && (detailError ? <Alert tone="error"><span>{detailError}</span> <Button size="compact" onClick={() => void onLoadComparison().catch(() => undefined)}>Retry loading comparison</Button></Alert>
        : <p role="status">{loading ? "Loading pinned comparison…" : "Open this section to load the pinned model results."}</p>)}
      {comparisonOpen && comparison && (comparisonState.error ? <Alert tone="error">{comparisonState.error}</Alert> : <>
        <SelectedModelDetails rows={comparisonState.rows} selectedModelId={selectedModelId} onSelect={setSelectedModelId}
          implementorModelId={implementorModelId} implementorSaving={implementorSaving} onChooseImplementor={() => void handleChooseImplementor()} />
        <SuitabilityComparison data={comparison} rows={comparisonState.rows} evaluationIds={comparison.task.evaluation_weights.map(weight => weight.evaluation_id)} highlightModelId={implementorModelId} />
      </>)}
    </details>
  </Card>;
}

export default function Planner({ data }: { data: PlannerData }) {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const isLibrary = path === "/suitability/saved";
  const isReview = path.startsWith("/suitability/") && !isLibrary;
  const taskId = isReview ? path.split("/")[2] : "";
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedTaskSummary[]>([]);
  const [categories, setCategories] = useState<SuitabilityCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [browserSaved, setBrowserSaved] = useState<SavedComparison[]>([]);
  const [active, setActive] = useState<SavedComparison | null>(null);
  const [libraryDetails, setLibraryDetails] = useState<Record<string, SavedComparison>>({});
  const [libraryDetailErrors, setLibraryDetailErrors] = useState<Record<string, string>>({});
  const [libraryLoading, setLibraryLoading] = useState<string[]>([]);
  const [libraryRetry, setLibraryRetry] = useState(0);
  const [libraryLayout, setLibraryLayout] = useState<SavedTaskLayout | null>(null);
  const [localLibraryLayout, setLocalLibraryLayout] = useState<SavedTaskLayout>(emptySavedTaskLayout);
  const [libraryLayoutError, setLibraryLayoutError] = useState("");
  const [libraryLayoutLoading, setLibraryLayoutLoading] = useState(false);
  const [libraryLayoutSaving, setLibraryLayoutSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [request, setRequest] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [weights, setWeights] = useState<EvaluationWeight[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [implementorModelId, setImplementorModelId] = useState<string | null>(null);
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [modelMode, setModelMode] = useState<"all" | "favorites">("all");
  const [completeOnly, setCompleteOnly] = useState(false);
  const [librarySearch, setLibrarySearch] = useState(searchParams.get("q") ?? "");
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [showInlineCategoryCreate, setShowInlineCategoryCreate] = useState(false);
  const [categoryNameEdits, setCategoryNameEdits] = useState<Record<string, string>>({});
  const [categoryActionError, setCategoryActionError] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncingBrowserSaved, setSyncingBrowserSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const openedPath = useRef("");
  const appliedCategoryPrefill = useRef("");
  const previousComparison = useRef("");
  const libraryDetailRequests = useRef(new Map<string, Promise<SavedComparison>>());
  const libraryLayoutSavingRef = useRef(false);
  const selectedCategoryIds = searchParams.getAll("category");
  const returnTo = searchParams.get("returnTo");
  const libraryReturnPath = returnTo?.startsWith("/suitability/saved") ? returnTo : "/suitability/saved";
  const currentLibraryPath = `${path}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const createTaskHref = isLibrary ? `/suitability?returnTo=${encodeURIComponent(currentLibraryPath)}` : `/suitability?returnTo=${encodeURIComponent(libraryReturnPath)}`;
  const categoryPrefill = !isLibrary && !isReview ? searchParams.get("category") ?? "" : "";

  const replaceLibraryUrl = (query: string, selected: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q"); params.delete("category");
    if (query.trim()) params.set("q", query);
    [...new Set(selected)].forEach(id => params.append("category", id));
    const suffix = params.toString();
    router.replace(`/suitability/saved${suffix ? `?${suffix}` : ""}`, { scroll: false });
  };

  const updateLibrarySearch = (value: string) => {
    setLibrarySearch(value);
    replaceLibraryUrl(value, selectedCategoryIds);
  };

  useEffect(() => setLibrarySearch(searchParams.get("q") ?? ""), [searchParams]);
  useEffect(() => {
    if (!categoryPrefill) { appliedCategoryPrefill.current = ""; return; }
    if (!categoriesLoaded || appliedCategoryPrefill.current === categoryPrefill) return;
    appliedCategoryPrefill.current = categoryPrefill;
    setCategoryId(categories.some(category => category.id === categoryPrefill) ? categoryPrefill : "");
  }, [categoryPrefill, categories, categoriesLoaded]);
  useEffect(() => {
    if (!categoriesLoaded || !active?.category_id) return;
    const current = categories.find(category => category.id === active.category_id);
    if (!current) {
      setCategoryId("");
      setActive(previous => previous ? { ...previous, category_id: null, category_name: null } : previous);
    } else if (active.category_name !== current.name) {
      setActive(previous => previous ? { ...previous, category_name: current.name } : previous);
    }
  }, [categoriesLoaded, categories, active?.category_id, active?.category_name]);

  useEffect(() => {
    const refresh = () => setFavorites(readModelFavorites());
    refresh();
    return subscribeToModelFavorites(refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (openedPath.current !== path) { recordSuitabilityEvent("planner_opened"); openedPath.current = path; }
    setReady(false); setError(""); setNotice(""); setEditing(false);
    setCategories([]); setCategoriesLoaded(false); setCategoriesError("");
    setLibraryLayout(null); setLibraryLayoutError(""); setLibraryLayoutLoading(false); setLibraryLayoutSaving(false);
    libraryLayoutSavingRef.current = false;
    setLocalLibraryLayout(readLocalTaskLayout());
    void fetchCategories().then(items => {
      if (cancelled) return;
      setCategories(items); setCategoriesLoaded(true); setCategoriesError("");
    }).catch(cause => {
      if (cancelled) return;
      setCategories([]); setCategoriesLoaded(false); setCategoriesError(loadErrorMessage(cause, "Categories are unavailable."));
    });
    let localTasks: SavedComparison[] = [];
    let localError = "";
    const activate = (activeTask: SavedComparison | null, loadError = "") => {
      if (cancelled) return;
      setActive(activeTask); setTitle(activeTask?.task.title ?? ""); setRequest(activeTask?.task.request ?? "");
      setCategoryId(activeTask?.category_id ?? "");
      setWeights(activeTask?.task.evaluation_weights ?? []); setSelected(activeTask?.task.candidate_model_ids ?? []);
      setImplementorModelId(activeTask?.task.implementor_model_id ?? null);
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
          setLibraryLayoutLoading(true);
          void fetchSharedTaskLayout().then(layout => {
            if (cancelled) return;
            setLibraryLayout(layout); setLibraryLayoutError(""); setLibraryLayoutLoading(false);
          }).catch(cause => {
            if (cancelled) return;
            setLibraryLayout(null); setLibraryLayoutError(loadErrorMessage(cause, "Saved task layout could not be loaded.")); setLibraryLayoutLoading(false);
          });
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
    || (active.category_id ?? "") !== categoryId
    || JSON.stringify(active.task.evaluation_weights) !== JSON.stringify(weights)
    || JSON.stringify(active.task.candidate_model_ids) !== JSON.stringify(selected)
    || (active.task.implementor_model_id ?? null) !== implementorModelId;
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
  const updateSelected = (next: string[]) => {
    setSelected(next);
    if (implementorModelId && !next.includes(implementorModelId)) setImplementorModelId(null);
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
      const availableCategories = categoriesLoaded ? categories : await refreshCategories();
      const current = await fetchSharedTaskSummaries();
      const conflicting = browserSaved.filter(task => current.some(shared => shared.task.id === task.task.id && shared.task.updated_at > task.task.updated_at));
      if (conflicting.length) throw new Error("A shared task has newer settings. Your browser copy is retained; download a backup before resolving the difference.");
      let categoriesDropped = 0;
      const syncedLayoutCategories = new Set<string>();
      for (const task of browserSaved) {
        const matchedCategory = (task.category_id ? availableCategories.find(item => item.id === task.category_id) : null)
          ?? (task.category_name ? availableCategories.find(item => normalizeCategoryName(item.name) === normalizeCategoryName(task.category_name!)) : null);
        const categoryWasLost = !!(task.category_id || task.category_name) && !matchedCategory;
        if (categoryWasLost) categoriesDropped++;
        const upload = { ...task, category_id: matchedCategory?.id ?? null, category_name: matchedCategory?.name ?? null };
        upload.category_revision = task.category_revision ?? 0;
        syncedLayoutCategories.add(layoutCategoryId(upload.category_id));
        const savedCategory = await saveSharedTask(upload);
        upload.category_revision = savedCategory.revision;
        upload.category_name = savedCategory.categoryName;
        const summary = summarizeComparison(upload);
        setSaved(previous => [summary, ...previous.filter(item => item.task.id !== task.task.id)]);
        setLibraryDetails(previous => ({ ...previous, [task.task.id]: upload }));
        await removeBrowserTask(task);
        setBrowserSaved(previous => previous.filter(item => item.task.id !== task.task.id));
      }
      if (syncedLayoutCategories.size) {
        const nextCategories = Object.fromEntries(Object.entries(localLibraryLayout.categories).filter(([categoryId]) => !syncedLayoutCategories.has(categoryId)));
        setLocalLayout({ revision: 0, categories: nextCategories });
      }
      setNotice(categoriesDropped ? `Browser-saved tasks synced. ${categoriesDropped} unmatched ${categoriesDropped === 1 ? "category was" : "categories were"} changed to Uncategorized.` : "Browser-saved tasks synced to the shared library.");
    } catch (cause) { setError(loadErrorMessage(cause, "Browser-saved tasks could not be added to the shared list.")); }
    finally { setSyncingBrowserSaved(false); }
  };
  const restoreBackup = async (file: File) => {
    try {
      const comparison = migrateBrowserTask(savedComparisonSchema.parse(JSON.parse(await file.text())), data.candidates);
      comparisonRows(comparison, comparison.task.evaluation_weights, comparison.task.candidate_model_ids);
      let importedCategoryDropped = false;
      if (categoriesLoaded && (comparison.category_id || comparison.category_name)) {
        const match = (comparison.category_id ? categories.find(item => item.id === comparison.category_id) : null)
          ?? (comparison.category_name ? categories.find(item => normalizeCategoryName(item.name) === normalizeCategoryName(comparison.category_name!)) : null);
        importedCategoryDropped = !match;
        comparison.category_id = match?.id ?? null;
        comparison.category_name = match?.name ?? null;
      }
      const existing = browserSaved.find(item => item.task.id === comparison.task.id);
      if (existing && existing.task.updated_at > comparison.task.updated_at) throw new Error("A newer copy is already saved in this browser. The backup was not imported.");
      await saveBrowserTask(comparison);
      setBrowserSaved(previous => [comparison, ...previous.filter(item => item.task.id !== comparison.task.id)]);
      setNotice(`Backup imported and saved in this browser. Shared sync is pending.${importedCategoryDropped ? " Its category was not found in this library, so it was imported as Uncategorized." : ""}`); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The backup could not be imported."); }
  };
  const createComparison = () => {
    const now = new Date().toISOString();
    const task: SuitabilityTask = suitabilityTaskSchema.parse({ id: active?.task.id ?? crypto.randomUUID(), title: title.trim().slice(0, 80), request: request.trim(),
      evaluation_weights: weights, candidate_model_ids: selected, implementor_model_id: implementorModelId && selected.includes(implementorModelId) ? implementorModelId : null,
      score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
      created_at: active?.task.created_at ?? now, updated_at: now, last_calculated_at: now, schema_version: 1 });
    return { ...pinComparison(task, working), category_id: categoryId || null,
      category_name: categories.find(item => item.id === categoryId)?.name ?? null,
      category_revision: active?.category_revision ?? 0 };
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
        try {
          const savedCategory = await saveSharedTask(pinned);
          pinned.category_revision = savedCategory.revision;
          pinned.category_name = savedCategory.categoryName;
          sharedSaved = true;
        }
        catch (cause) { sharedError = cause instanceof Error ? cause.message : "Shared saves are unavailable."; }
      }
      if (!locallySaved && !sharedSaved) throw new Error(`The task was not saved. ${browserError} ${sharedError} Your selections are still visible.`);
      if (sharedSaved && locallySaved) {
        try { await saveBrowserTask(pinned); } catch { /* A successful shared save remains complete if the local cache cannot be refreshed. */ }
      }
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
      const backQuery = returnTo?.startsWith("/suitability/saved") ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
      router.replace(`/suitability/${task.id}${backQuery}`, { scroll: false });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Task could not be saved to the shared database. Your current selections are still visible."); }
    finally { setSaving(false); }
  };

  const libraryTasks = useMemo(() => {
    const byId = new Map<string, { summary: SavedTaskSummary; shared: boolean; hasShared: boolean; localComparison: SavedComparison | null }>(
      saved.map(summary => [summary.task.id, { summary, shared: true, hasShared: true, localComparison: null }]),
    );
    for (const comparison of browserSaved) {
      const cloud = byId.get(comparison.task.id);
      if (!cloud || comparison.task.updated_at >= cloud.summary.task.updated_at)
        byId.set(comparison.task.id, { summary: summarizeComparison(comparison), shared: false, hasShared: !!cloud, localComparison: comparison });
    }
    return [...byId.values()].sort((a, b) => b.summary.task.updated_at.localeCompare(a.summary.task.updated_at) || a.summary.task.id.localeCompare(b.summary.task.id));
  }, [saved, browserSaved]);

  const refreshCategories = async () => {
    try {
      const items = await fetchCategories();
      setCategories(items); setCategoriesLoaded(true); setCategoriesError("");
      return items;
    } catch (cause) {
      setCategories([]); setCategoriesLoaded(false); setCategoriesError(loadErrorMessage(cause, "Categories are unavailable."));
      throw cause;
    }
  };

  const handleCreateCategory = async (event: FormEvent) => {
    event.preventDefault(); setCategoryActionError(""); setCategoryBusy(true);
    try {
      const created = await createCategory(categoryNameDraft);
      setCategories(previous => [...previous, created].sort((a, b) => a.name.localeCompare(b.name, "en")));
      setCategoriesLoaded(true); setCategoriesError(""); setCategoryNameDraft(""); setCategoryId(created.id);
      setNotice(`Created ${created.name}.`);
    } catch (cause) { setCategoryActionError(cause instanceof Error ? cause.message : "Category could not be created."); }
    finally { setCategoryBusy(false); }
  };

  const handleInlineCreateCategory = async () => {
    setCategoryActionError(""); setCategoryBusy(true);
    try {
      const created = await createCategory(categoryNameDraft);
      setCategories(previous => [...previous, created].sort((a, b) => a.name.localeCompare(b.name, "en")));
      setCategoriesLoaded(true); setCategoriesError(""); setCategoryId(created.id); setCategoryNameDraft(""); setShowInlineCategoryCreate(false);
      setNotice(`Created ${created.name}.`);
    } catch (cause) { setCategoryActionError(cause instanceof Error ? cause.message : "Category could not be created."); }
    finally { setCategoryBusy(false); }
  };

  const handleRenameCategory = async (category: SuitabilityCategory) => {
    setCategoryActionError(""); setCategoryBusy(true);
    try {
      const updated = await renameCategory(category.id, categoryNameEdits[category.id] ?? category.name);
      setCategories(previous => previous.map(item => item.id === updated.id ? updated : item).sort((a, b) => a.name.localeCompare(b.name, "en")));
      setCategoryNameEdits(previous => { const next = { ...previous }; delete next[category.id]; return next; });
      setNotice(`Renamed category to ${updated.name}.`);
    } catch (cause) { setCategoryActionError(cause instanceof Error ? cause.message : "Category could not be renamed."); }
    finally { setCategoryBusy(false); }
  };

  const handleDeleteCategory = async (category: SuitabilityCategory) => {
    const affected = libraryTasks.filter(item => item.summary.task.category_id === category.id).length;
    if (!window.confirm(`Delete ${category.name}? Its ${affected} ${affected === 1 ? "task will" : "tasks will"} move to Uncategorized.`)) return;
    setCategoryActionError(""); setCategoryBusy(true);
    try {
      await deleteCategory(category.id);
      setCategories(previous => previous.filter(item => item.id !== category.id));
      if (categoryId === category.id) setCategoryId("");
      replaceLibraryUrl(librarySearch, selectedCategoryIds.filter(id => id !== category.id));
      setNotice(`Deleted ${category.name}. Its tasks are now Uncategorized.`);
    } catch (cause) { setCategoryActionError(cause instanceof Error ? cause.message : "Category could not be deleted."); }
    finally { setCategoryBusy(false); }
  };

  const handleAssignCategory = async (item: { summary: SavedTaskSummary; shared: boolean; localComparison: SavedComparison | null }, nextCategoryId: string | null) => {
    const category = categories.find(option => option.id === nextCategoryId) ?? null;
    if (item.shared) {
      const updated = await assignSharedTaskCategory(item.summary.task.id, nextCategoryId, item.summary.task.category_revision ?? 0);
      const summary = { ...item.summary, task: { ...item.summary.task, category_id: updated.category_id, category_name: updated.category_name,
        category_revision: updated.category_revision, updated_at: updated.updated_at } };
      setSaved(previous => previous.map(value => value.task.id === summary.task.id ? summary : value));
      setLibraryDetails(previous => {
        const comparison = previous[item.summary.task.id];
        return comparison ? { ...previous, [item.summary.task.id]: { ...comparison, category_id: updated.category_id,
          category_name: updated.category_name, category_revision: updated.category_revision,
          task: { ...comparison.task, updated_at: updated.updated_at } } } : previous;
      });
      setNotice(`Moved ${item.summary.task.title} to ${category?.name ?? "Uncategorized"}.`);
      return;
    }
    if (!item.localComparison) throw new Error("The browser-saved task could not be loaded.");
    const now = new Date().toISOString();
    const updated: SavedComparison = { ...item.localComparison, category_id: nextCategoryId, category_name: category?.name ?? null,
      category_revision: item.localComparison.category_revision ?? 0, task: { ...item.localComparison.task, updated_at: now } };
    await saveBrowserTask(updated);
    setBrowserSaved(previous => previous.map(task => task.task.id === updated.task.id ? updated : task));
    setNotice(`Moved ${item.summary.task.title} to ${category?.name ?? "Uncategorized"}.`);
  };

  const handleSetImplementor = async (item: { summary: SavedTaskSummary; shared: boolean; localComparison: SavedComparison | null }, modelId: string) => {
    const taskId = item.summary.task.id;
    const comparison = item.shared ? libraryDetails[taskId] ?? await loadLibraryComparison(taskId) : item.localComparison;
    if (!comparison) throw new Error("The saved comparison could not be loaded.");
    if (!comparison.task.candidate_model_ids.includes(modelId)) throw new Error("Choose a model from this saved comparison.");
    const candidate = comparison.candidates.find(model => model.model_id === modelId);
    const updated: SavedComparison = { ...comparison, task: { ...comparison.task, implementor_model_id: modelId, updated_at: new Date().toISOString() } };
    if (item.shared) {
      const savedCategory = await saveSharedTask(updated);
      const persisted: SavedComparison = { ...updated, category_revision: savedCategory.revision, category_name: savedCategory.categoryName };
      setSaved(previous => previous.map(value => value.task.id === taskId ? summarizeComparison(persisted) : value));
      setLibraryDetails(previous => ({ ...previous, [taskId]: persisted }));
    } else {
      await saveBrowserTask(updated);
      setBrowserSaved(previous => previous.map(value => value.task.id === taskId ? updated : value));
    }
    setNotice(`${candidate?.model ?? modelId} is now the implementor for ${comparison.task.title}.`);
  };

  const unknownCategories = !categoriesLoaded ? libraryTasks.flatMap(item => {
    const id = item.summary.task.category_id;
    return id && !categories.some(category => category.id === id) ? [{ id, name: "Category unavailable", normalized_name: "category-unavailable", created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString() }] : [];
  }) : [];
  const filterCategories = [...categories, ...unknownCategories.filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)];
  const categorizedTasks = libraryTasks.map(item => ({ ...item, task: item.summary.task }));
  const localBrowserTaskIds = useMemo(() => new Set(browserSaved.map(item => item.task.id)), [browserSaved]);
  const libraryTaskOrder = useMemo(() => {
    const order: Record<string, readonly string[]> = {};
    for (const [categoryId, entry] of Object.entries(libraryLayout?.categories ?? {})) order[categoryId] = entry.task_ids;
    for (const [categoryId, entry] of Object.entries(localLibraryLayout.categories)) {
      if (entry.task_ids.some(taskId => localBrowserTaskIds.has(taskId))) order[categoryId] = entry.task_ids;
    }
    return order;
  }, [libraryLayout, localBrowserTaskIds, localLibraryLayout]);
  const groupedLibrary = groupSavedTaskIds(categorizedTasks, selectedCategoryIds, filterCategories, librarySearch, libraryTaskOrder);
  const libraryTotal = libraryTasks.length;

  const setLocalLayout = (next: SavedTaskLayout) => {
    const normalized = { revision: 0, categories: next.categories };
    setLocalLibraryLayout(normalized);
    writeLocalTaskLayout(normalized);
  };

  const reloadLibraryLayout = async (announce = false) => {
    setLibraryLayoutLoading(true);
    try {
      const latest = await fetchSharedTaskLayout();
      setLibraryLayout(latest); setLibraryLayoutError("");
      if (announce) setNotice("Saved task layout loaded.");
      return latest;
    } catch (cause) {
      setLibraryLayoutError(loadErrorMessage(cause, "Saved task layout could not be loaded."));
      throw cause;
    } finally { setLibraryLayoutLoading(false); }
  };

  const persistLayoutOperation = async (
    operation: SavedTaskLayoutOperation,
    optimistic: SavedTaskLayout,
    previous: SavedTaskLayout,
    previousLocal: SavedTaskLayout,
  ) => {
    if (libraryLayoutSavingRef.current) return;
    libraryLayoutSavingRef.current = true;
    setLibraryLayoutSaving(true); setLibraryLayoutError(""); setLibraryLayout(optimistic);
    try {
      const savedLayout = await saveSharedTaskLayout(operation);
      setLibraryLayout(savedLayout); setNotice("Saved task layout updated.");
    } catch (cause) {
      setLibraryLayout(previous); setLocalLayout(previousLocal);
      try { await reloadLibraryLayout(); } catch { /* Keep the last confirmed layout when recovery is unavailable. */ }
      setLibraryLayoutError(loadErrorMessage(cause, "Saved task layout could not be updated. Try again."));
    } finally {
      libraryLayoutSavingRef.current = false; setLibraryLayoutSaving(false);
    }
  };

  const handleToggleSavedCategory = async (categoryId: string | null) => {
    if (librarySearch || libraryLayoutSavingRef.current) return;
    const key = layoutCategoryId(categoryId);
    const group = groupedLibrary.groups.find(item => layoutCategoryId(item.id) === key);
    if (!group) return;
    if (libraryLayoutLoading && group.tasks.some(item => item.hasShared)) return;
    const serverEntry = libraryLayout?.categories[key];
    const localEntry = localBrowserTaskIds.size && group.tasks.some(item => localBrowserTaskIds.has(item.task.id)) ? localLibraryLayout.categories[key] : undefined;
    const collapsed = serverEntry?.collapsed ?? localEntry?.collapsed ?? false;
    const nextCollapsed = !collapsed;
    const previousLocal = localLibraryLayout;
    const groupTaskIds = group.tasks.map(item => item.task.id);
    const nextLocal = localEntry ? { ...localLibraryLayout, categories: { ...localLibraryLayout.categories, [key]: { ...localEntry, collapsed: nextCollapsed } } }
      : { ...localLibraryLayout, categories: { ...localLibraryLayout.categories, [key]: { task_ids: groupTaskIds, collapsed: nextCollapsed } } };
    if (!libraryLayout) {
      setLocalLayout(nextLocal);
      setNotice("Saved task layout is unavailable across browsers. This collapse preference is temporary in this browser.");
      return;
    }
    const previous = libraryLayout;
    const optimistic: SavedTaskLayout = {
      ...previous,
      categories: { ...previous.categories, [key]: { task_ids: serverEntry?.task_ids ?? group.tasks.filter(item => item.hasShared).map(item => item.task.id), collapsed: nextCollapsed } },
    };
    await persistLayoutOperation({ type: "collapse", category_id: key, collapsed: nextCollapsed, expected_revision: previous.revision }, optimistic, previous, previousLocal);
  };

  const handleMoveSavedTask = async (categoryId: string | null, taskId: string, direction: "up" | "down") => {
    if (librarySearch || libraryLayoutSavingRef.current) return;
    const key = layoutCategoryId(categoryId);
    const group = groupedLibrary.groups.find(item => layoutCategoryId(item.id) === key);
    if (!group) return;
    if (libraryLayoutLoading && group.tasks.some(item => item.hasShared)) return;
    const index = group.tasks.findIndex(item => item.task.id === taskId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= group.tasks.length) return;
    const nextItems = [...group.tasks];
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
    const nextTaskIds = nextItems.map(item => item.task.id);
    const containsLocalTask = group.tasks.some(item => localBrowserTaskIds.has(item.task.id));
    const previousLocal = localLibraryLayout;
    const localEntry = localLibraryLayout.categories[key];
    const serverEntry = libraryLayout?.categories[key];
    const nextLocal = containsLocalTask
      ? { ...localLibraryLayout, categories: { ...localLibraryLayout.categories, [key]: { task_ids: nextTaskIds, collapsed: localEntry?.collapsed ?? serverEntry?.collapsed ?? false } } }
      : localLibraryLayout;
    const hasSharedTask = group.tasks.some(item => item.hasShared);
    if (containsLocalTask) setLocalLayout(nextLocal);
    if (!hasSharedTask) {
      setNotice("Saved task order updated in this browser.");
      return;
    }
    if (!libraryLayout) {
      setLibraryLayoutError("Saved task layout is unavailable. Retry layout loading before reordering shared tasks.");
      if (containsLocalTask) setLocalLayout(previousLocal);
      return;
    }
    const previous = libraryLayout;
    const sharedTaskIds = nextItems.filter(item => item.hasShared).map(item => item.task.id);
    const optimistic: SavedTaskLayout = {
      ...previous,
      categories: { ...previous.categories, [key]: { task_ids: sharedTaskIds, collapsed: serverEntry?.collapsed ?? false } },
    };
    await persistLayoutOperation({ type: "move", category_id: key, task_ids: sharedTaskIds, expected_revision: previous.revision }, optimistic, previous, previousLocal);
  };

  useEffect(() => {
    if (!isLibrary || !categoriesLoaded) return;
    const invalid = selectedCategoryIds.filter(id => id !== "__uncategorized__" && !categories.some(category => category.id === id));
    if (invalid.length) {
      replaceLibraryUrl(librarySearch, selectedCategoryIds.filter(id => !invalid.includes(id)));
      setNotice("A selected category was removed. Its tasks are now Uncategorized.");
    }
  }, [isLibrary, categoriesLoaded, categories, searchParams]);
  const sharedListUnavailable = error.startsWith("Shared tasks could not be loaded.");

  if (!ready) return <div className="ui-loading-state"><Spinner label="Loading saved tasks" /><span>Loading saved tasks…</span></div>;

  if (isLibrary) return <div className={styles.planner}>
    <PageHeader>
      <div className="eyebrow">Task suitability · saved library</div><h1>Saved tasks</h1>
      <p>Shared tasks are visible to everyone who visits this site. Browser saves stay on this device until you sync or download them. Costs are captured Artificial Analysis Intelligence Index task costs, not quotes for your custom task.</p>
    </PageHeader>
    <div className={styles.libraryToolbar}>
      <LinkButton variant="primary" href={createTaskHref}>Create a task</LinkButton>
      <label className={`${styles.searchField} ${styles.librarySearchField}`} htmlFor="saved-task-search">Search saved tasks<Input id="saved-task-search" type="search" value={librarySearch} onChange={event => updateLibrarySearch(event.target.value)} placeholder="Search titles or task descriptions" /></label>
      <details className={styles.categoryFilter}>
        <summary>{selectedCategoryIds.length ? `Categories · ${selectedCategoryIds.length} selected` : "All categories"}</summary>
        <div className={styles.categoryFilterPanel} role="group" aria-labelledby="category-filter-heading">
          <p id="category-filter-heading" className={styles.categoryFilterHeading}>Filter by task category</p>
          {[...filterCategories.map(category => ({ id: category.id, name: category.name })), { id: "__uncategorized__", name: "Uncategorized" }].map(category => {
            const checked = selectedCategoryIds.includes(category.id);
            return <label key={category.id} className={styles.categoryFilterOption}><Checkbox checked={checked} onChange={() => replaceLibraryUrl(librarySearch, checked ? selectedCategoryIds.filter(id => id !== category.id) : [...selectedCategoryIds, category.id])} />{category.name}</label>;
          })}
          <div className={styles.categoryManagerSection} aria-labelledby="manage-categories-heading">
            <h3 id="manage-categories-heading">Manage categories</h3>
            {!categoriesLoaded ? <Alert tone="warning"><p>Categories are unavailable. Tasks remain accessible and assignments have been kept.</p><Button onClick={() => void refreshCategories().catch(() => undefined)}>Retry category loading</Button></Alert> : null}
            {categoriesLoaded && categories.length === 0 && <p>No categories yet. Add one to organize saved tasks.</p>}
            {categoriesLoaded && categories.map(category => <div className={styles.categoryManageRow} key={category.id}>
              <Input aria-label={`Rename ${category.name}`} maxLength={60} value={categoryNameEdits[category.id] ?? category.name} onChange={event => setCategoryNameEdits(previous => ({ ...previous, [category.id]: event.target.value }))} />
              <span>{libraryTasks.filter(item => item.summary.task.category_id === category.id).length} tasks</span>
              <Button size="compact" disabled={categoryBusy || (categoryNameEdits[category.id] ?? category.name) === category.name} loading={categoryBusy} onClick={() => void handleRenameCategory(category)}>Rename</Button>
              <Button variant="quiet" size="compact" disabled={categoryBusy} onClick={() => void handleDeleteCategory(category)}>Delete</Button>
            </div>)}
            <form className={styles.categoryCreateForm} onSubmit={event => void handleCreateCategory(event)}>
              <label className={styles.searchField} htmlFor="new-task-category">Add category<Input id="new-task-category" maxLength={60} value={categoryNameDraft} onChange={event => setCategoryNameDraft(event.target.value)} placeholder="e.g. Research" disabled={!categoriesLoaded || categoryBusy} /></label>
              <Button type="submit" disabled={!categoriesLoaded || !categoryNameDraft.trim() || categoryBusy} loading={categoryBusy}>Add category</Button>
            </form>
            {categoryActionError && <Alert className={styles.taskActionError} tone="error">{categoryActionError}</Alert>}
          </div>
        </div>
      </details>
      <div className={styles.libraryImport}>
        <label className={styles.libraryImportButton} htmlFor="task-backup">Import backup</label>
        <Input className={styles.visuallyHiddenInput} id="task-backup" aria-label="Import a task backup" type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); event.target.value = ""; }} />
      </div>
    </div>
    {error && <Alert className="workflow-alert" tone="error"><p>{error}</p>{sharedListUnavailable && <Button onClick={() => setLibraryRetry(value => value + 1)}>Reload shared tasks</Button>}</Alert>}
    {categoriesError && <Alert className="workflow-alert" tone="warning"><p>Category information is unavailable. Saved tasks remain accessible, and existing assignments are unchanged.</p><Button onClick={() => void refreshCategories().catch(() => undefined)}>Retry categories</Button></Alert>}
    {libraryLayoutError && <Alert className="workflow-alert" tone="warning"><p>{libraryLayoutError} Saved tasks remain accessible; temporary layout changes apply only in this browser.</p><Button onClick={() => void reloadLibraryLayout(true).catch(() => undefined)} disabled={libraryLayoutLoading} loading={libraryLayoutLoading}>Retry layout loading</Button></Alert>}
    {browserSaved.length > 0 && <Card className={styles.browserSyncCard}>
      <div className={styles.browserSyncHeader}>
        <div><h2>{browserSaved.length} task{browserSaved.length === 1 ? "" : "s"} saved in this browser</h2><p>Shared sync is pending. Sync {browserSaved.length === 1 ? "it" : "them"} to make {browserSaved.length === 1 ? "it" : "them"} available to everyone who visits this site.</p></div>
        <Button onClick={syncBrowserTasks} disabled={syncingBrowserSaved} loading={syncingBrowserSaved}>Sync to shared library</Button>
      </div>
      <p className={styles.browserSyncNote}>Download a backup before clearing browser data.</p>
    </Card>}
    {libraryTasks.length > 0 && <div className={styles.libraryResultsStatus} aria-live="polite"><span>Showing {groupedLibrary.filteredCount} of {libraryTotal} tasks</span>
      <div className={styles.libraryFilterChips}>
        {selectedCategoryIds.map(id => <span className={styles.libraryFilterChip} key={id}>{id === "__uncategorized__" ? "Uncategorized" : filterCategories.find(category => category.id === id)?.name ?? "Category unavailable"}
          <button type="button" aria-label={`Remove ${id === "__uncategorized__" ? "Uncategorized" : filterCategories.find(category => category.id === id)?.name ?? "category"} filter`} onClick={() => replaceLibraryUrl(librarySearch, selectedCategoryIds.filter(selectedId => selectedId !== id))}>×</button>
        </span>)}
        {(librarySearch || selectedCategoryIds.length > 0) && <Button variant="quiet" size="compact" onClick={() => { setLibrarySearch(""); replaceLibraryUrl("", []); }}>Clear filters</Button>}
      </div>
      {librarySearch && <span className={styles.libraryReorderHint}>Clear search to reorder tasks.</span>}
      {libraryLayoutSaving && <span className={styles.libraryReorderHint} role="status">Saving layout…</span>}
    </div>}
    {libraryTasks.length === 0 && (librarySearch || selectedCategoryIds.length > 0) ? <Card><EmptyState title="No matching saved tasks" description="Try a different search or category filter." action={selectedCategoryIds.length === 1 && selectedCategoryIds[0] !== "__uncategorized__" && categories.some(category => category.id === selectedCategoryIds[0]) ? <LinkButton variant="primary" href={`/suitability?category=${encodeURIComponent(selectedCategoryIds[0])}&returnTo=${encodeURIComponent(currentLibraryPath)}`}>Create a task in this category</LinkButton> : <Button onClick={() => { setLibrarySearch(""); replaceLibraryUrl("", []); }}>Clear filters</Button>} /></Card>
      : libraryTasks.length === 0 ? <Card><EmptyState title={sharedListUnavailable ? "Shared task list unavailable" : "No saved tasks yet"} description={sharedListUnavailable ? "Try reloading the shared list. Browser-saved copies still appear here when available." : "Save a task comparison to return to its pinned model results later."} action={!error ? <LinkButton variant="primary" href="/suitability">Create your first task</LinkButton> : undefined} /></Card>
      : groupedLibrary.groups.length === 0 ? <Card><EmptyState title="No matching saved tasks" description="Try a different search or category filter." action={selectedCategoryIds.length === 1 && categories.some(category => category.id === selectedCategoryIds[0]) ? <LinkButton variant="primary" href={`/suitability?category=${encodeURIComponent(selectedCategoryIds[0])}&returnTo=${encodeURIComponent(currentLibraryPath)}`}>Create a task in this category</LinkButton> : <Button onClick={() => { setLibrarySearch(""); replaceLibraryUrl("", []); }}>Clear filters</Button>} /></Card>
      : <div className={styles.savedGroups}>{groupedLibrary.groups.map(group => {
        const groupKey = layoutCategoryId(group.id);
        const hasLocalTask = group.tasks.some(item => localBrowserTaskIds.has(item.task.id));
        const localCollapsed = hasLocalTask || !libraryLayout ? localLibraryLayout.categories[groupKey]?.collapsed : undefined;
        const collapsed = librarySearch ? false : libraryLayout?.categories[groupKey]?.collapsed ?? localCollapsed ?? false;
        const groupContentId = `saved-tasks-group-${groupKey}`;
        const hasSharedTasks = group.tasks.some(item => item.hasShared);
        const layoutBusyForGroup = libraryLayoutSaving || (libraryLayoutLoading && hasSharedTasks);
        const reorderDisabled = Boolean(librarySearch || layoutBusyForGroup || (hasSharedTasks && !libraryLayout));
        return <section className={styles.savedGroup} key={groupKey}>
        <h2 className={styles.savedGroupHeading}><button type="button" className={styles.savedGroupToggle} aria-expanded={!collapsed} aria-controls={groupContentId} disabled={Boolean(librarySearch || layoutBusyForGroup)} onClick={() => void handleToggleSavedCategory(group.id)}>
          <span className={styles.savedGroupToggleMain}><span className={styles.savedGroupChevron} aria-hidden="true">{collapsed ? "›" : "⌄"}</span><span>{group.name}</span></span>
          <span className={styles.savedGroupCount}>{group.tasks.length} task{group.tasks.length === 1 ? "" : "s"}</span>
        </button></h2>
        {!collapsed && <div className={styles.savedList} id={groupContentId}>{group.tasks.map((item, index) => {
          const { summary, shared, localComparison } = item;
          const taskId = summary.task.id;
          const comparison = shared ? libraryDetails[taskId] ?? null : localComparison;
          const categoryLabel = !categoriesLoaded && summary.task.category_id ? "Category unavailable" : categories.find(category => category.id === summary.task.category_id)?.name ?? "Uncategorized";
          return <SavedTaskEntry key={taskId} summary={summary} shared={shared} localComparison={localComparison} loadedComparison={comparison}
            categories={categories} categoriesLoaded={categoriesLoaded} categoryLabel={categoryLabel} returnTo={`${path}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
            onAssignCategory={categoryId => handleAssignCategory(item, categoryId)}
            onSetImplementor={modelId => handleSetImplementor(item, modelId)}
            canMoveUp={index > 0} canMoveDown={index < group.tasks.length - 1} reorderDisabled={reorderDisabled}
            onMove={direction => void handleMoveSavedTask(group.id, taskId, direction)}
            detailError={libraryDetailErrors[taskId]} loading={libraryLoading.includes(taskId)} onLoadComparison={() => loadLibraryComparison(taskId)} />;
        })}</div>}
      </section>;
      })}</div>}
    {notice && <Alert className="workflow-alert" tone="info" role="status" live="polite">{notice}</Alert>}
  </div>;

  if (isReview && !editing) {
    if (!active) return <Card><h1>Saved comparison unavailable</h1>{error && <Alert tone="error">{error}</Alert>}<Link href={libraryReturnPath}>Back to saved tasks</Link></Card>;
    let comparisonError = "";
    let rows = [] as ReturnType<typeof comparisonRows>;
    try { rows = comparisonRows(active, active.task.evaluation_weights, active.task.candidate_model_ids); }
    catch (cause) { comparisonError = cause instanceof Error ? cause.message : "Pinned comparison data is unavailable."; }
    return <div className={styles.planner}>
      <PageHeader>
      <div className="breadcrumb"><Link href={libraryReturnPath}>Saved tasks</Link> / {active.task.title}</div>
      <div className="eyebrow">Saved comparison</div><h1>{active.task.title}</h1><p>{active.task.request}</p>
      <p>{active.task.evaluation_weights.length} evaluations · {active.task.candidate_model_ids.length} candidates · Updated {niceDate(active.task.updated_at)}</p>
      <p>Category: {!categoriesLoaded && active.category_id ? "Category unavailable" : categories.find(category => category.id === active.category_id)?.name ?? "Uncategorized"}</p>
      </PageHeader>
      <div className="toolbar"><Button onClick={() => { setCategoryId(active.category_id ?? ""); setEditing(true); }}>Edit settings</Button><LinkButton variant="primary" href={createTaskHref}>New task</LinkButton><Link href={libraryReturnPath}>Saved tasks library</Link></div>
      <Alert className="workflow-alert" tone={browserSaved.some(item => item.task.id === active.task.id && item.task.updated_at >= active.task.updated_at) ? "warning" : "success"} role="status" live="polite">{browserSaved.some(item => item.task.id === active.task.id && item.task.updated_at >= active.task.updated_at) ? "Saved in this browser · shared sync pending. Keep a backup before clearing browser data or switching devices." : "Saved to the shared library."}</Alert>
      {categoriesError && <Alert className="workflow-alert" tone="warning"><p>Category information is unavailable. The saved comparison is still available.</p><Button onClick={() => void refreshCategories().catch(() => undefined)}>Retry categories</Button></Alert>}
      <div className="toolbar"><Button onClick={() => downloadBackup(currentCategoryBackup(active, categories, categoriesLoaded))}>Download backup</Button>{browserSaved.some(item => item.task.id === active.task.id) && <Button onClick={syncBrowserTasks} disabled={syncingBrowserSaved} loading={syncingBrowserSaved}>Sync browser tasks to shared library</Button>}</div>
      {notice && <Alert className="workflow-alert" tone="info" role="status" live="polite">{notice}</Alert>}
      {error && <Alert className="workflow-alert" tone="error">{error}</Alert>}
      {comparisonError ? <Alert className="workflow-alert" tone="error">{comparisonError}</Alert> : <Card><h2>Model comparison</h2><SuitabilityComparison data={active} rows={rows} evaluationIds={active.task.evaluation_weights.map(weight => weight.evaluation_id)} highlightModelId={active.task.implementor_model_id ?? null} /></Card>}
    </div>;
  }

  if (isReview && !active) return <Card><h1>Saved comparison unavailable</h1>{error && <Alert tone="error">{error}</Alert>}<Link href={libraryReturnPath}>Back to saved tasks</Link></Card>;

  return <div className={styles.planner}>
    <PageHeader>
    <div className="eyebrow">Task suitability · shared saves</div>
    <h1>{active ? `Edit ${active.task.title}` : "Find the best model for a task."}</h1>
    <p>Choose source rankings and priorities, then compare models with transparent coverage and pinned cost context. Browser saves work while shared storage is unavailable and stay on this browser and device.</p>
    </PageHeader>
    <div className="toolbar"><Link href={isReview ? libraryReturnPath : "/suitability/saved"}>Saved tasks library</Link>{isReview && <Button variant="quiet" onClick={() => { setCategoryId(active?.category_id ?? ""); setEditing(false); }}>Cancel editing</Button>}</div>
    {active?.candidates.some(candidate => !candidate.source_model_ids) && <Alert className="workflow-alert" tone="info">This saved task keeps its original model matching. <Link href="/suitability">Create a new task</Link> to compare models across known alternate sheet labels.</Alert>}
    {error && <Alert className="workflow-alert" tone="error">{error}</Alert>}
    {categoriesError && <Alert className="workflow-alert" tone="warning"><p>Category information is unavailable. The task can still be edited and saved.</p><Button onClick={() => void refreshCategories().catch(() => undefined)}>Retry categories</Button></Alert>}
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
        <FormField id="task-category" label="Category" helper={categoriesError || "You can change this category later in Saved tasks."}>
          <Select id="task-category" value={categoryId} onChange={event => setCategoryId(event.target.value)} disabled={!categoriesLoaded}>
            <option value="">Uncategorized</option>
            {categoryId && !categories.some(category => category.id === categoryId) && <option value={categoryId}>Category unavailable</option>}
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </FormField>
      </div>
      <div className={styles.inlineCategoryCreate}>
        <Button variant="quiet" size="compact" type="button" disabled={!categoriesLoaded || categoryBusy} onClick={() => { setCategoryNameDraft(""); setCategoryActionError(""); setShowInlineCategoryCreate(value => !value); }}>Create category</Button>
        {showInlineCategoryCreate && <><Input aria-label="New category name" maxLength={60} value={categoryNameDraft} onChange={event => setCategoryNameDraft(event.target.value)} placeholder="Category name" />
          <Button size="compact" type="button" disabled={!categoryNameDraft.trim() || categoryBusy} loading={categoryBusy} onClick={() => void handleInlineCreateCategory()}>Save category</Button></>}
        {categoryActionError && showInlineCategoryCreate && <span role="alert">{categoryActionError}</span>}
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
        <div className={styles.modelActionGroup}><span className={styles.modelActionLabel}>Selection</span><Button onClick={() => updateSelected([...new Set([...selected, ...visibleModels.map(candidate => candidate.model_id)])])}>Select visible</Button>
          <Button variant="quiet" onClick={() => { const visible = new Set(visibleModels.map(candidate => candidate.model_id)); updateSelected(selected.filter(id => !visible.has(id))); }}>Deselect visible</Button></div>
        <div className={`${styles.modelActionGroup} ${styles.modelActionGroupFavorites}`}><span className={styles.modelActionLabel}>Favorites</span><Button onClick={() => updateSelected([...new Set([...selected, ...availableFavorites.map(candidate => candidate.model_id)])])} disabled={!availableFavorites.length}>Add favorites</Button>
          <Button variant="quiet" onClick={() => updateSelected(availableFavorites.map(candidate => candidate.model_id))} disabled={!availableFavorites.length}>Replace with favorites</Button></div>
      </div>
      {unavailableFavorites.length > 0 && <Alert tone="info" role="status">{unavailableFavorites.length} favorited model{unavailableFavorites.length === 1 ? " is" : "s are"} unavailable in the current candidate catalog. They remain in your favorites; no substitute was selected.</Alert>}
      {favoriteNotice && <Alert tone="error" role="status" live="polite">{favoriteNotice}</Alert>}
      <div className={styles.chips}>{working.candidates.filter(candidate => selected.includes(candidate.model_id)).map(candidate => <Button key={candidate.model_id} size="compact" variant="quiet" aria-label={`Remove ${candidate.model}, ${candidate.provider}`} onClick={() => updateSelected(selected.filter(id => id !== candidate.model_id))}>{candidate.model} · {candidate.provider} ×</Button>)}</div>
      <div className={styles.picker}>{visibleModels.map(candidate => {
        const identity = candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model);
        const isFavorite = favorites.includes(identity);
        return <div className={styles.candidateOption} key={candidate.model_id}><Checkbox aria-label={`Select ${candidate.model}, ${candidate.provider}`} checked={selected.includes(candidate.model_id)} onChange={event => updateSelected(event.target.checked ? [...selected, candidate.model_id] : selected.filter(id => id !== candidate.model_id))} />
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
      <SuitabilityComparison data={working} rows={result.rows} evaluationIds={weights.map(weight => weight.evaluation_id)} completeOnly={completeOnly} onCompleteOnlyChange={setCompleteOnly} highlightModelId={implementorModelId} />
    </Card>}
    <Section id="methodology" className="prose"><h2>How suitability works</h2><p>Each source rank becomes a 0–100 component: 100 × (1 − (rank − 1) / max(1, cohort size − 1)), clamped to 0–100. Suitability averages these components using your weights. Higher is better. Weighted average source rank uses the same available weights; lower is better.</p><p>Missing entries stay “Not ranked” and are excluded from the average. Coverage shows the selected weight with a rank. Complete weight coverage sorts first. Cost is shown as separate context and is not used in the score.</p><p>Saved tasks preserve their full source cohorts and capture dates. New imports do not change saved results or pinned costs. Source links open the currently published leaderboards, which may have newer ranks. <Link href="/about/data">Read the data notes</Link>.</p></Section>
  </div>;
}
