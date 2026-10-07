"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/ui/primitives";
import {Drawer} from "@/components/ui/drawer";

const links = [
  { href: "/", label: "Evaluations", icon: "evaluations" },
  { href: "/suitability", label: "Task suitability", icon: "suitability" },
  { href: "/suitability/saved", label: "Saved tasks", icon: "saved" },
  { href: "/about/data", label: "About the data", icon: "about" },
] as const;

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/suitability/saved") return pathname === href;
  if (href === "/suitability") return pathname === href || (pathname.startsWith("/suitability/") && pathname !== "/suitability/saved");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "evaluations") return <svg aria-hidden="true" viewBox="0 0 20 20" {...common}><path d="M3 8.5 10 3l7 5.5"/><path d="M5.5 8v8.5h9V8M8 16.5v-5h4v5"/></svg>;
  if (name === "suitability") return <svg aria-hidden="true" viewBox="0 0 20 20" {...common}><path d="M4 4.5h12M4 10h12M4 15.5h7"/><circle cx="2.5" cy="4.5" r=".5"/><circle cx="2.5" cy="10" r=".5"/><circle cx="2.5" cy="15.5" r=".5"/></svg>;
  if (name === "saved") return <svg aria-hidden="true" viewBox="0 0 20 20" {...common}><path d="M5 3.5h10v13l-5-3.2-5 3.2z"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 20 20" {...common}><path d="M3.5 4.5c2.3-.9 4.5-.6 6.5.7v11c-2-1.3-4.2-1.6-6.5-.7zM16.5 4.5c-2.3-.9-4.5-.6-6.5.7v11c2-1.3 4.2-1.6 6.5-.7z"/></svg>;
}

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="app-navigation" aria-label="Main navigation">
      {links.map(item => {
        const current = isCurrentPath(pathname, item.href);
        return (
          <Link
            className="app-navigation__link"
            href={item.href}
            key={item.href}
            aria-current={current ? "page" : undefined}
            onClick={onNavigate}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return <Link className="app-brand" href="/"><img className="app-brand__mark" src="/icon.svg" alt="" aria-hidden="true" /><span>Model Atlas</span></Link>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <Brand />
        <Navigation pathname={pathname} />
        <div className="app-rail__footer">Artificial Analysis<br />leaderboard snapshots</div>
      </aside>

      <header className="app-topbar">
        <Brand />
        <button
          className="app-menu-trigger"
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen(true)}
        >
          <span className="app-menu-trigger__icon" aria-hidden="true"><span /><span /><span /></span>
          <span>Menu</span>
        </button>
      </header>

      <main className="app-main" id="main-content">
        <PageContainer>{children}</PageContainer>
        <footer className="app-footer">Artificial Analysis leaderboard snapshots</footer>
      </main>

      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} title="Navigation" id="mobile-navigation">
        <Navigation pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </div>
  );
}
