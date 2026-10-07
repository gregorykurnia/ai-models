import "./globals.css";
import AppShell from "@/components/app-shell";
import {Geist, Geist_Mono} from "next/font/google";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Model Atlas",
  description: "Compare AI model evaluations, rankings, and task suitability.",
  icons: { icon: "/icon.svg" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${geist.variable} ${geistMono.variable}`}><body><AppShell>{children}</AppShell></body></html>;
}
