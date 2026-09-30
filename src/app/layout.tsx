import Link from "next/link";
import "./globals.css";

export const metadata = { title: "Model Benchmarks", description: "Browse Artificial Analysis leaderboard snapshots and model rankings." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><header className="site-header"><Link href="/" className="brand"><span className="brand-icon">M</span> Model Benchmarks</Link><nav aria-label="Main navigation"><Link href="/">Evaluations</Link><Link href="/suitability">Task suitability</Link><Link href="/suitability/saved">Saved tasks</Link><Link href="/about/data">About the data</Link></nav></header><main>{children}</main><footer>Artificial Analysis leaderboard snapshots</footer></body></html>;
}
