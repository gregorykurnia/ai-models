import salesProposal from "../../workflows/sales-proposal.json";
import { validateWorkflow, type Workflow } from "./workflows";

// Add each static JSON import here, keyed by its file path.
const sources: Record<string, unknown> = {
  "workflows/sales-proposal.json": salesProposal,
};

export const workflows: readonly Workflow[] = Object.entries(sources)
  .map(([file, source]) => validateWorkflow(file, source));
