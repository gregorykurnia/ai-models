import { Badge, Card, EmptyState, HelperText, Table, TableScroll } from "@/components/ui/primitives";
import { masterEvaluationLabel, type MasterRow } from "@/lib/master";
import { formatPercentile, type PersonalityDataset } from "@/lib/personality";
import {
  evaluationRanks, rankStep, stepPicks,
  type RankedWorkflowModel, type Workflow, type WorkflowStep, type WorkflowTarget,
} from "@/lib/workflows";
import leaderboardSource from "../../data/leaderboards.json";

const aims = ["high", "moderate", "low"] as const;
const evaluationsBySlug = new Map(leaderboardSource.evaluations.map(evaluation => [evaluation.slug, evaluation]));

type LabeledStep = Omit<WorkflowStep, "targets"> & {
  targets: (WorkflowTarget & { label: string })[];
};

function MissingValue() {
  return <span className="muted">—</span>;
}

function ModelPick({ row }: { row: RankedWorkflowModel }) {
  return <>
    <span className="workflow-pick-name">{row.model.name}</span>
    <span className="workflow-pick-meta">
      <span>{row.model.provider}</span>
      <span>Fit {formatPercentile(row.fit)}</span>
    </span>
  </>;
}

function WorkflowOverview({ steps, dataset }: { steps: LabeledStep[]; dataset: PersonalityDataset }) {
  return <Card className="master workflow-table-card" aria-labelledby="workflow-overview">
    <h2 id="workflow-overview">Overview</h2>
    <TableScroll label="Workflow overview, scroll horizontally for more columns" showOverflowCue>
      <Table className="workflow-overview-table">
        <thead><tr>
          <th scope="col" className="workflow-pinned">Step</th>
          <th scope="col" className="workflow-mobile-pick">Pick</th>
          <th scope="col" className="workflow-goal">Goal</th>
          <th scope="col" className="workflow-aim workflow-aim-high">Aim high</th>
          <th scope="col" className="workflow-aim workflow-aim-moderate">Aim moderate</th>
          <th scope="col" className="workflow-aim workflow-aim-low">Aim low</th>
          <th scope="col" className="workflow-desktop-pick">Pick</th>
          <th scope="col">Runners-up</th>
        </tr></thead>
        <tbody>{steps.map(step => {
          const { pick, runnersUp } = stepPicks(step, dataset);
          const pickContent = pick ? <div className="workflow-pick"><ModelPick row={pick} /></div> : <MissingValue />;
          return <tr key={step.id}>
            <td className="workflow-pinned">
              <span className="workflow-step-number">Step {step.id}</span>
              <a href={`#step-${step.id}`}>{step.title}</a>
            </td>
            <td className="workflow-mobile-pick">{pickContent}</td>
            <td>{step.goal}</td>
            {aims.map(aim => {
              const labels = [...new Set(step.targets.filter(target => target.aim === aim).map(target => target.label))];
              return <td key={aim} className="workflow-aim">{labels.length
                ? <div className="workflow-targets">{labels.map(label => <Badge key={label}>{label}</Badge>)}</div>
                : <MissingValue />}</td>;
            })}
            <td className="workflow-desktop-pick">{pickContent}</td>
            <td>{runnersUp.length ? <ul className="workflow-runners-up">
              {runnersUp.map(row => <li key={row.model.identity_key}><ModelPick row={row} /></li>)}
            </ul> : <MissingValue />}</td>
          </tr>;
        })}</tbody>
      </Table>
    </TableScroll>
  </Card>;
}

function WorkflowStepDetail({ step, dataset, masterRows }: {
  step: LabeledStep;
  dataset: PersonalityDataset;
  masterRows: MasterRow[];
}) {
  const rows = rankStep(step, dataset);
  const evaluationSlugs = [...new Set(step.evaluations)];
  const headingId = `workflow-step-heading-${step.id}`;
  const rankHelpId = `workflow-step-rank-help-${step.id}`;
  const fewMetrics = step.targets.length + evaluationSlugs.length <= 2;

  return <Card className="master workflow-table-card" id={`step-${step.id}`} aria-labelledby={headingId}>
    <h2 id={headingId}>Step {step.id} · {step.title}</h2>
    <p>{step.goal}</p>
    {evaluationSlugs.length > 0 && <HelperText id={rankHelpId}>
      Fit measures how closely a model matches the step’s personality targets. Evaluation columns show its rank in each benchmark.
    </HelperText>}
    <TableScroll label={`Step ${step.id} rankings, scroll horizontally for more columns`} showOverflowCue>
      <Table
        aria-describedby={evaluationSlugs.length > 0 ? rankHelpId : undefined}
        className={`workflow-rankings-table${fewMetrics ? " workflow-rankings-table--few-metrics" : ""}`}
      >
        <thead><tr>
          <th scope="col" className="numeric">Rank</th>
          <th scope="col" className="workflow-pinned workflow-model">Model</th>
          <th scope="col">Provider</th>
          {step.targets.map((target, index) => (
            <th scope="col" className="numeric workflow-target-heading" key={index}>
              {target.label}<small>aim {target.aim}</small>
            </th>
          ))}
          <th scope="col" className="numeric workflow-fit">Fit</th>
          {evaluationSlugs.map(slug => {
            const evaluation = evaluationsBySlug.get(slug);
            const label = evaluation ? masterEvaluationLabel(evaluation) : slug;
            const versioned = label.match(/^(.+) (v\d+(?:\.\d+)*)$/);
            return <th scope="col" className="numeric workflow-evaluation-heading" key={slug} title={evaluation?.display_name}>
              {versioned ? <>{versioned[1]} <small>{versioned[2]}</small></> : label}
            </th>;
          })}
        </tr></thead>
        <tbody>{rows.map(({ model, percentiles, fit }, index) => {
          const ranks = evaluationRanks(model.identity_key, evaluationSlugs, masterRows);
          return <tr key={model.identity_key}>
            <td className="numeric">{index + 1}</td>
            <td className="workflow-pinned workflow-model">{model.name}</td>
            <td>{model.provider}</td>
            {percentiles.map((value, position) => <td className="numeric" key={position}>
              {value === null ? <MissingValue /> : formatPercentile(value)}
            </td>)}
            <td className="numeric">{fit === null ? <MissingValue /> : formatPercentile(fit)}</td>
            {evaluationSlugs.map(slug => {
              const rank = ranks[slug];
              return <td className="numeric workflow-evaluation-rank" key={slug}>
                {rank ? `#${rank.rank} of ${rank.cohortSize}` : "Not ranked"}
              </td>;
            })}
          </tr>;
        })}{rows.length === 0 && <tr><td className="empty" colSpan={4 + step.targets.length + evaluationSlugs.length}>No models available.</td></tr>}</tbody>
      </Table>
    </TableScroll>
    {step.other_checks && <HelperText><strong>Also check (not in Model Atlas)</strong> · {step.other_checks}</HelperText>}
    {step.note && <p>{step.note}</p>}
  </Card>;
}

export default function WorkflowView({ workflow, dataset, masterRows }: {
  workflow: Workflow;
  dataset: PersonalityDataset;
  masterRows: MasterRow[];
}) {
  if (workflow.steps.length === 0) return <Card><EmptyState title="No workflow steps yet" /></Card>;

  const indexLabels = new Map(dataset.indexes.map(index => [index.key, `${index.label} index`]));
  const traitLabels = new Map(dataset.indexes.flatMap(index => index.traits.map(trait => [trait.key, trait.label])));
  const steps = workflow.steps.map(step => ({
    ...step,
    targets: step.targets.map(target => ({
      ...target,
      label: target.index !== undefined
        ? indexLabels.get(target.index) ?? `${target.index} index`
        : traitLabels.get(target.trait) ?? target.trait,
    })),
  }));

  return <>
    <WorkflowOverview steps={steps} dataset={dataset} />
    {steps.map(step => <WorkflowStepDetail key={step.id} step={step} dataset={dataset} masterRows={masterRows} />)}
  </>;
}
