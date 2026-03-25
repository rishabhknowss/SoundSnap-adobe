"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/dashboard/credits", label: "credits", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/dashboard/account", label: "account", icon: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" },
];

interface Props {
  children: React.ReactNode;
  user: { name: string | null; email: string; credits: number } | null;
  onLogout: () => void;
}

export function DashboardShell({ children, user, onLogout }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#FAFAF8] dark:bg-[#0C0A14] text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[220px] flex-col border-r border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#0C0A14]">
        {/* Brand */}
        <div className="h-14 flex items-center px-5">
          <Link href="/" className="font-bold text-sm tracking-tight">soundsnap.</Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white font-medium"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                }`}
              >
                <svg className={`w-4 h-4 ${active ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600"}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 space-y-3 border-t border-zinc-200 dark:border-white/[0.06]">
          {/* Credits */}
          <Link href="/dashboard/credits" className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">credits</span>
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{user?.credits ?? 0}</span>
          </Link>

          {/* Theme + User */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-300 shrink-0">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{user?.name?.split(" ")[0]?.toLowerCase() || user?.email?.split("@")[0]}</span>
            </div>
            <ThemeToggle />
          </div>

          <button onClick={onLogout} className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/5 transition-all">
            sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden h-12 border-b border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#0C0A14] flex items-center justify-between px-4">
          <Link href="/" className="font-bold text-sm">soundsnap.</Link>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-1 rounded">{user?.credits ?? 0}</span>
            <ThemeToggle />
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`p-1.5 rounded-lg transition-colors ${active ? "bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
