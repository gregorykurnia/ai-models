import "./globals.css";
import AppShell from "@/components/app-shell";

export const metadata = { title: "Model Benchmarks", description: "Browse Artificial Analysis leaderboard snapshots and model rankings." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
