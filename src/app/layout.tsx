import "./globals.css";
import AppShell from "@/components/app-shell";
import {IBM_Plex_Mono, Source_Sans_3} from "next/font/google";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = { title: "Model Benchmarks", description: "Browse Artificial Analysis leaderboard snapshots and model rankings." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sourceSans.variable} ${ibmPlexMono.variable}`}><body><AppShell>{children}</AppShell></body></html>;
}
