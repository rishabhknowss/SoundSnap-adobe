"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Suspense } from "react";

interface User { id: string; email: string; name: string | null; credits: number; activationKey: string | null; }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense><DashboardLayoutInner>{children}</DashboardLayoutInner></Suspense>;
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);

  const getToken = () => localStorage.getItem("soundsnap_token");

  useEffect(() => {
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      localStorage.setItem("soundsnap_token", tokenFromUrl);
      window.history.replaceState({}, "", "/dashboard");
    }

    const token = getToken();
    if (!token) { router.push("/"); return; }

    fetch("/api/auth/me", { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401) { localStorage.removeItem("soundsnap_token"); router.push("/"); return null; } return r.json(); })
      .then(d => { if (d) setUser(d.user); })
      .catch(() => {});
  }, [params, router]);

  const logout = () => { localStorage.removeItem("soundsnap_token"); router.push("/"); };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#111]"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 animate-pulse" /><p className="text-violet-400/60 text-xs font-medium">Loading...</p></div></div>;

  return <DashboardShell user={{ name: user.name, email: user.email, credits: user.credits }} onLogout={logout}>{children}</DashboardShell>;
}
