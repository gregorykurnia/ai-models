import clientMeetingFollowup from "../../workflows/client-meeting-followup.json";
import meetingSummary from "../../workflows/meeting-summary.json";
import models from "../../workflows/models.json";
import salesProposal from "../../workflows/sales-proposal.json";
import { validateModelList, validateWorkflow, type Workflow } from "./workflows";

export const workflowModelList = validateModelList("workflows/models.json", models);

// Add each workflow import here, keyed by its file path.
const sources: Record<string, unknown> = {
  "workflows/sales-proposal.json": salesProposal,
  "workflows/client-meeting-followup.json": clientMeetingFollowup,
  "workflows/meeting-summary.json": meetingSummary,
};

export const workflows: readonly Workflow[] = Object.entries(sources)
  .map(([file, source]) => validateWorkflow(file, source));
