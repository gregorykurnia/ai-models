"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

export default function SuitabilityComparison({ data, rows, completeOnly = false, onCompleteOnlyChange }: {
  data: PlannerData; rows: SuitabilityResult[]; completeOnly?: boolean; onCompleteOnlyChange?: (value: boolean) => void;
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
  const columnCount = 5 + (rows[0]?.breakdown.length ?? 0);

  return <>
    {onCompleteOnlyChange && <label className={styles.option}><Checkbox checked={completeOnly} onChange={event => {
      onCompleteOnlyChange(event.target.checked);
      if (event.target.checked) recordSuitabilityEvent("complete_coverage_filter_used");
    }} />Complete coverage only</label>}
    <p>Cost per Intelligence Index task is Artificial Analysis’s captured weighted average for one Index task, not a price for your custom task. Each value links to the model profile and shows its capture date. Cost does not affect suitability.</p>
    <TableScroll label="Suitability results, scroll horizontally for all evaluations">
      <Table className={styles.results}>
        <thead><tr><th scope="col">Model / provider</th>
          <th scope="col" className="numeric" aria-sort={sortBy === "suitability" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><Button variant="quiet" size="compact" onClick={() => chooseSort("suitability")}>Suitability {sortLabel("suitability")}</Button></th>
          <th scope="col" className="numeric">Coverage</th><th scope="col" className="numeric">Weighted average rank ↓</th>
          <th scope="col" className="numeric" aria-sort={sortBy === "cost" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><Button variant="quiet" size="compact" onClick={() => chooseSort("cost")}>Cost per Intelligence Index task {sortLabel("cost")}<small>USD · capture date shown per model</small></Button></th>
          {rows[0]?.breakdown.map(item => <th scope="col" className="numeric" key={item.evaluation_id}>{data.evaluations.find(evaluation => evaluation.id === item.evaluation_id)?.display_name ?? item.evaluation_id}</th>)}
        </tr></thead>
        <tbody>{visibleRows.map(row => <tr key={row.model_id}>
          <td><strong>{row.model}</strong><small>{row.provider}</small>
            <details onToggle={event => { if (event.currentTarget.open) recordSuitabilityEvent("result_breakdown_opened"); }}><summary>Calculation breakdown</summary>
              <div className={styles.breakdown}>{row.breakdown.map(item => {
                const evaluation = data.evaluations.find(entry => entry.id === item.evaluation_id);
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
          <td className="numeric">{row.ranked_evaluations} of {row.selected_evaluations} evaluations · {row.coverage_percent.toFixed(1)}% weight</td>
          <td className="numeric">{row.weighted_average_rank === null ? "No rank" : number(row.weighted_average_rank)}</td>
          <td className="numeric">{row.intelligence_index_cost ? <><a href={row.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${row.model}`}>{money.format(row.intelligence_index_cost.cost_usd)}</a><small>Captured {captureDate(row.intelligence_index_cost.captured_at)}</small></> : <span className="muted">—</span>}</td>
          {row.breakdown.map(item => <td className="numeric" key={item.evaluation_id}>{item.source_rank ?? "Not ranked"}{item.scoring_status && <small>{item.scoring_status}</small>}</td>)}
        </tr>)}{visibleRows.length === 0 && <tr><td className="empty" colSpan={columnCount}>{completeOnly ? "No candidates have complete weight coverage." : "No candidates are available for this comparison."}</td></tr>}</tbody>
      </Table>
    </TableScroll>
  </>;
}
