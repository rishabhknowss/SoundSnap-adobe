"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User { id: string; email: string; name: string | null; credits: number; activationKey: string | null; }
interface Transaction { id: string; type: string; creditsAmount: number; amountPaid: number | null; createdAt: string; }
interface Generation { id: string; creditsUsed: number; sourceType: string | null; videoUrl: string | null; outputUrl: string | null; prompt: string | null; status: string; createdAt: string; }

export default function DashboardOverview() {
  return <Suspense><OverviewContent /></Suspense>;
}

function OverviewContent() {
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);

  const getToken = () => localStorage.getItem("soundsnap_token");
  const authHeaders = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }), []);

  useEffect(() => {
    const token = params.get("token");
    if (token) { localStorage.setItem("soundsnap_token", token); window.history.replaceState({}, "", "/dashboard"); }
    if (params.get("payment") === "success") { setToast("Payment received! Credits added."); setTimeout(() => setToast(""), 4000); }
    loadData();
  }, [params]);

  const loadData = async () => {
    try {
      const [userRes, creditsRes, genRes] = await Promise.all([
        fetch("/api/auth/me", { headers: authHeaders() }),
        fetch("/api/credits", { headers: authHeaders() }),
        fetch("/api/generations", { headers: authHeaders() }),
      ]);
      if (userRes.ok) { const d = await userRes.json(); setUser(d.user); }
      if (creditsRes.ok) { const d = await creditsRes.json(); setCredits(d.credits); setTransactions(d.transactions); }
      if (genRes.ok) { const d = await genRes.json(); setGenerations(d.generations || []); }
    } catch {}
  };

  const copyKey = () => {
    if (user?.activationKey) { navigator.clipboard.writeText(user.activationKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  if (!user) return null;

  const totalSpent = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold">{toast}</div>
      )}

      {/* Video modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8" onClick={() => setSelected(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-sm truncate">{selected.prompt || "Audio Generation"}</p>
                <p className="text-white/40 text-xs mt-0.5">{new Date(selected.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">&times;</button>
            </div>
            <div className="overflow-auto rounded-xl border border-white/10 bg-black/50 p-6">
              {selected.outputUrl ? <video src={selected.outputUrl} controls className="w-full rounded-lg" /> : <div className="p-20 text-center text-white/30 text-sm">Video not available</div>}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back, {user.name?.split(" ")[0] || "there"}</h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">Here&apos;s what&apos;s happening with your account</p>
      </div>

      {/* Bento stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-[#16132A] border border-zinc-200/60 dark:border-violet-500/8 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Credits</p>
          <p className="text-3xl font-extrabold mt-1.5 tracking-tight text-violet-600 dark:text-violet-400">{credits}</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">available</p>
        </div>
        <div className="bg-white dark:bg-[#16132A] border border-zinc-200/60 dark:border-violet-500/8 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Generated</p>
          <p className="text-3xl font-extrabold mt-1.5 tracking-tight">{generations.length}</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">audio tracks</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#16132A] border border-zinc-200/60 dark:border-violet-500/8 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Spent</p>
          <p className="text-3xl font-extrabold mt-1.5 tracking-tight">${(totalSpent / 100).toFixed(2)}</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">lifetime</p>
        </div>
      </div>

      {/* Activation Key */}
      {user.activationKey && (
        <div className="bg-violet-50/80 dark:bg-violet-500/[0.06] border border-violet-200/60 dark:border-violet-500/10 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
                <p className="text-sm font-bold">Addon Activation Key</p>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 ml-6">Enter this in Adobe Express to connect your account</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white dark:bg-[#0C0A14] border-2 border-violet-300/50 dark:border-violet-500/15 px-4 py-2.5 rounded-xl font-mono text-base font-extrabold text-violet-700 dark:text-violet-400 tracking-[0.12em] select-all">
                {user.activationKey}
              </code>
              <Button variant="outline" size="sm" onClick={copyKey} className="rounded-xl border-violet-300/50 dark:border-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/10 h-[44px] px-3.5 shrink-0 font-bold text-xs">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Generations */}
      <div className="bg-white dark:bg-[#16132A] border border-zinc-200/60 dark:border-violet-500/8 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm">Recent Generations</p>
          {generations.length > 0 && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{generations.length} total</span>
          )}
        </div>
        {generations.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2"/></svg>
            </div>
            <p className="font-bold text-sm">No generations yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">Generate audio from the Adobe Express addon to see them here.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {generations.slice(0, 8).map((gen) => (
              <div key={gen.id} onClick={() => setSelected(gen)} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.03] border border-transparent hover:border-zinc-200/60 dark:hover:border-violet-500/8 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/15 transition-colors">
                  <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{gen.prompt || "Audio Generation"}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">{new Date(gen.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 rounded-md ${gen.status === "success" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"}`}>{gen.status}</Badge>
                <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
