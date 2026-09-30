import Planner from "@/components/suitability-planner";
import { getEntries, getEvaluations } from "@/lib/data";
import { buildPlannerData } from "@/lib/suitability-data";

export const dynamic = "force-dynamic";
export default async function SuitabilityPage() {
  const evaluations = await getEvaluations();
  const sourceEntries = (await Promise.all(evaluations.map(getEntries))).flat();
  return <Planner data={buildPlannerData(evaluations, sourceEntries)} />;
}
