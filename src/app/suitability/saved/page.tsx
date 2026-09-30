import Planner from "@/components/suitability-planner";
import { getPublishedDataset } from "@/lib/data";
import { buildPlannerData } from "@/lib/suitability-data";

export const dynamic = "force-dynamic";

export default async function SavedSuitabilityPage() {
  const {evaluations,entries} = await getPublishedDataset();
  return <Planner data={buildPlannerData(evaluations, entries)} />;
}
