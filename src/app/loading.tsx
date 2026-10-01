import {Spinner} from "@/components/ui/primitives";

export default function Loading() {
  return <div className="ui-loading-state"><Spinner label="Loading leaderboard data" /><span>Loading leaderboard data…</span></div>;
}
