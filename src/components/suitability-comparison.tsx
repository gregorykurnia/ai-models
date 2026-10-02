"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordSuitabilityEvent } from "@/lib/suitability-analytics";
import { calculateSuitability, type EvaluationWeight, type SuitabilityResult } from "@/lib/suitability";
import type { PlannerData } from "@/lib/suitability-storage";
import { Button, Checkbox, Table, TableScroll } from "@/components/ui/primitives";
import styles from "./suitability-planner.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (value: number | null) => value === null ? "No score" : value.toFixed(1);
const captureDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00Z` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function comparisonRows(data: PlannerData, weights: EvaluationWeight[], candidateIds: string[]): SuitabilityResult[] {
  return calculateSuitability({ ...data, weights, candidates: data.candidates.filter(candidate => candidateIds.includes(candidate.model_id)) });
}

export default function SuitabilityComparison({ data, rows, evaluationIds, completeOnly = false, onCompleteOnlyChange, highlightModelId }: {
  data: PlannerData; rows: SuitabilityResult[]; evaluationIds: string[]; completeOnly?: boolean; onCompleteOnlyChange?: (value: boolean) => void; highlightModelId?: string | null;
}) {
  const [sortBy, setSortBy] = useState<"suitability" | "cost">("suitability");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    if (sortBy === "cost") {
      const left = a.intelligence_index_cost?.cost_usd ?? null;
      const right = b.intelligence_index_cost?.cost_usd ?? null;
      if (left === null && right !== null) return 1;
      if (right === null && left !== null) return -1;
      if (left !== null && right !== null && left !== right) return (left - right) * (sortDirection === "asc" ? 1 : -1);
      return a.model.localeCompare(b.model) || a.provider.localeCompare(b.provider);
    }
    const rankOrder = Number(b.complete_coverage) - Number(a.complete_coverage)
      || (b.score ?? -Infinity) - (a.score ?? -Infinity)
      || b.coverage_percent - a.coverage_percent
      || (a.weighted_average_rank ?? Infinity) - (b.weighted_average_rank ?? Infinity)
      || a.model.localeCompare(b.model) || a.provider.localeCompare(b.provider);
    return rankOrder * (sortDirection === "asc" ? -1 : 1);
  }), [rows, sortBy, sortDirection]);
  const chooseSort = (key: "suitability" | "cost") => {
    setSortDirection(current => sortBy === key ? current === "asc" ? "desc" : "asc" : key === "cost" ? "asc" : "desc");
    setSortBy(key);
  };
  const sortLabel = (key: "suitability" | "cost") => sortBy === key ? sortDirection === "asc" ? "↑" : "↓" : "↕";
  const visibleRows = sortedRows.filter(row => !completeOnly || row.complete_coverage);
  const evaluationById = useMemo(() => new Map(data.evaluations.map(evaluation => [evaluation.id, evaluation])), [data.evaluations]);
  const evaluationColumns = useMemo(() => evaluationIds.map(id => ({
    id,
    name: evaluationById.get(id)?.display_name ?? id,
  })), [evaluationById, evaluationIds]);
  const columnCount = 5 + evaluationColumns.length;
  const scrollFrame = useRef<HTMLDivElement>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const measureHorizontalOverflow = useCallback(() => {
    const viewport = scrollFrame.current?.querySelector<HTMLElement>(".table-scroll");
    setHasHorizontalOverflow(Boolean(viewport && viewport.scrollWidth > viewport.clientWidth + 1));
  }, []);

  useEffect(() => {
    const frame = scrollFrame.current;
    const viewport = frame?.querySelector<HTMLElement>(".table-scroll");
    const table = viewport?.querySelector("table");
    if (!viewport || !table) return;

    measureHorizontalOverflow();
    const observer = new ResizeObserver(measureHorizontalOverflow);
    observer.observe(viewport);
    observer.observe(table);
    viewport.addEventListener("scroll", measureHorizontalOverflow, { passive: true });
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", measureHorizontalOverflow);
    };
  }, [columnCount, measureHorizontalOverflow, visibleRows.length]);

  const sortIcon = (key: "suitability" | "cost") => <span aria-hidden="true">{sortLabel(key)}</span>;

  return <>
    <div className={styles.resultsIntro}>
      <div className={styles.resultsToolbar}>
        <div className={styles.resultSummary}>
          <p className={styles.resultsCount}>{visibleRows.length.toLocaleString()} {visibleRows.length === 1 ? "candidate" : "candidates"}<span aria-hidden="true">·</span>{evaluationColumns.length} {evaluationColumns.length === 1 ? "evaluation" : "evaluations"}</p>
          <p className={styles.orderNote}>Default suitability order prioritizes complete coverage, then score, coverage percentage, and weighted rank.</p>
        </div>
        {onCompleteOnlyChange && <label className={styles.completeFilter}><Checkbox checked={completeOnly} onChange={event => {
          onCompleteOnlyChange(event.target.checked);
          if (event.target.checked) recordSuitabilityEvent("complete_coverage_filter_used");
        }} />Complete coverage only</label>}
      </div>
      <div className={styles.costGuidance}>
        <p>Captured model-profile costs are weighted averages for one Index task, not estimates for your custom task. Cost does not affect suitability.</p>
        <details className={styles.costMethodology}>
          <summary>Cost source and capture dates</summary>
          <p>Each value links to its Artificial Analysis model profile. The capture date appears beneath its price.</p>
        </details>
      </div>
    </div>
    <div className={styles.scrollFrame} ref={scrollFrame}>
      <TableScroll className={styles.scrollRegion} label="Suitability results, scroll horizontally for all evaluations">
      <Table className={styles.results}>
        <caption className="sr-only">Suitability results, coverage, weighted average ranks, captured Artificial Analysis model costs, and original source ranks for each selected evaluation.</caption>
        <colgroup>
          <col className={styles.identityColumn} />
        </colgroup>
        <colgroup>
          <col className={styles.suitabilityColumn} />
          <col className={styles.coverageColumn} />
          <col className={styles.rankColumn} />
          <col className={styles.costColumn} />
        </colgroup>
        {evaluationColumns.length > 0 && <colgroup>
          {evaluationColumns.map(column => <col className={styles.evaluationColumn} key={column.id} />)}
        </colgroup>}
        <thead>
          <tr className={styles.headerGroups}>
            <th scope="col" rowSpan={2} className={styles.identityHeader}>
              <span className={styles.columnLabel}>Candidate<small>Model / provider</small></span>
            </th>
            <th scope="colgroup" colSpan={4} className={styles.groupHeader}>Comparison metrics</th>
            {evaluationColumns.length > 0 && <th scope="colgroup" colSpan={evaluationColumns.length} className={`${styles.groupHeader} ${styles.evaluationGroup}`}>Evaluation source ranks</th>}
          </tr>
          <tr className={styles.columnHeaders}>
          <th scope="col" className={`numeric ${styles.sortableHeader}`} aria-sort={sortBy === "suitability" ? sortDirection === "asc" ? "ascending" : "descending" : undefined}>
            <Button className={styles.sortButton} variant="quiet" size="compact" title="Default suitability order prioritizes complete coverage, then suitability." onClick={() => chooseSort("suitability")}>
              <span className={styles.columnLabel}>Suitability<small>Score out of 100</small></span>{sortIcon("suitability")}
            </Button>
          </th>
          <th scope="col" className={`numeric ${styles.columnHeader}`}>
            <span className={styles.columnLabel}>Coverage<small>Ranked · weighted coverage</small></span>
          </th>
          <th scope="col" className={`numeric ${styles.columnHeader}`}>
            <span className={styles.columnLabel}>Weighted average rank<small>Lower is better</small></span>
          </th>
          <th scope="col" className={`numeric ${styles.sortableHeader}`} aria-sort={sortBy === "cost" ? sortDirection === "asc" ? "ascending" : "descending" : undefined}>
            <Button className={styles.sortButton} variant="quiet" size="compact" title="Sort by the captured model-profile cost in USD." onClick={() => chooseSort("cost")}>
              <span className={styles.columnLabel}>Cost per Intelligence Index task<small>USD · captured per model</small></span>{sortIcon("cost")}
            </Button>
          </th>
          {evaluationColumns.map((column, index) => <th scope="col" className={`numeric ${styles.columnHeader} ${styles.evaluationHeader} ${index === 0 ? styles.evaluationHeaderFirst : ""}`} key={column.id}>
            <span className={styles.columnLabel}>{column.name}<small>Source rank</small></span>
          </th>)}
          </tr>
        </thead>
        <tbody>{visibleRows.map(row => {
          const breakdownByEvaluation = new Map(row.breakdown.map(item => [item.evaluation_id, item]));
          const isHighlighted = row.model_id === highlightModelId;
          return <tr key={row.model_id} className={isHighlighted ? styles.implementorRow : undefined} aria-current={isHighlighted ? "true" : undefined}>
          <td className={styles.identity}><strong>{row.model}</strong><small>{row.provider}</small>
            {isHighlighted && <span className={styles.implementorMarker}>Chosen implementor</span>}
            <details onToggle={event => { if (event.currentTarget.open) recordSuitabilityEvent("result_breakdown_opened"); }}><summary>Calculation breakdown</summary>
              <div className={styles.breakdown}>{row.breakdown.map(item => {
                const evaluation = evaluationById.get(item.evaluation_id);
                const href = evaluation ? `/leaderboards/${evaluation.slug}?q=${encodeURIComponent(item.source_model ?? row.model)}` : "#";
                return <div key={item.evaluation_id}><Link onClick={() => recordSuitabilityEvent("source_leaderboard_opened")} href={href}>{evaluation?.display_name ?? item.evaluation_id} →</Link>
                  <p>Weight {item.weight.toFixed(2)}% · rank {item.source_rank ?? "Not ranked"} · cohort {item.cohort_size}<br />Component {number(item.component_score)} · contribution {item.contribution === null ? "None" : `${number(item.contribution)} points`}<br />Captured {item.captured_at}{item.scoring_status && <><br />{item.scoring_status}</>}
                    {item.cost_display && <><br />Evaluation-specific source cost: {item.cost_display}{item.cost_usd !== null && item.cost_usd !== undefined ? ` · ${money.format(item.cost_usd)}` : ""}{item.cost_status === "bound" ? " · bounded source value" : ""}</>}
                  </p>
                </div>;
              })}</div>
            </details>
          </td>
          <td className="numeric">{number(row.score)}{!row.complete_coverage && <small>partial</small>}</td>
          <td className={`numeric ${styles.coverageValue}`}><span>{row.ranked_evaluations} of {row.selected_evaluations} ranked</span><small>{row.coverage_percent.toFixed(1)}% weight</small></td>
          <td className="numeric">{row.weighted_average_rank === null ? "No rank" : number(row.weighted_average_rank)}</td>
          <td className="numeric">{row.intelligence_index_cost ? <><a href={row.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${row.model}`}>{money.format(row.intelligence_index_cost.cost_usd)}</a><small>Captured {captureDate(row.intelligence_index_cost.captured_at)}</small></> : <span className="muted">—</span>}</td>
          {evaluationColumns.map((column, index) => {
            const item = breakdownByEvaluation.get(column.id);
            return <td className={`numeric ${index === 0 ? styles.evaluationCellFirst : ""}`} key={column.id}>{item?.source_rank === null || !item ? "Not ranked" : `#${item.source_rank}`}{item?.scoring_status && <small>{item.scoring_status}</small>}</td>;
          })}
          </tr>;
        })}{visibleRows.length === 0 && <tr><td className="empty" colSpan={columnCount}>{completeOnly ? "No candidates have complete weight coverage." : "No candidates are available for this comparison."}</td></tr>}</tbody>
      </Table>
      </TableScroll>
      {hasHorizontalOverflow && <p className={styles.scrollHint} aria-hidden="true">Scroll horizontally to compare all evaluation ranks <span>→</span></p>}
    </div>
  </>;
}
