"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface Pack { id: string; name: string; credits: number; displayPrice: string; perCredit: string; estimatedGenerations: string; }
interface Transaction { id: string; type: string; creditsAmount: number; amountPaid: number | null; createdAt: string; status: string; }

export default function CreditsPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const getToken = () => localStorage.getItem("soundsnap_token");
  const authHeaders = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }), []);

  useEffect(() => {
    Promise.all([
      fetch("/api/credits", { headers: authHeaders() }).then(r => r.json()),
      fetch("/api/credits/packs").then(r => r.json()),
    ]).then(([c, p]) => { setCredits(c.credits); setTransactions(c.transactions || []); setPacks(p.packs); }).catch(() => {});
  }, []);

  const buyPack = async (packId: string) => {
    setPurchasing(packId);
    try {
      const res = await fetch("/api/payments/checkout", { method: "POST", headers: authHeaders(), body: JSON.stringify({ packId }) });
      if (!res.ok) { alert("Failed to create checkout"); return; }
      const { paymentLink } = await res.json();
      window.open(paymentLink, "_blank");
      setToast("Complete payment in the new tab...");
      const start = credits;
      const poll = setInterval(async () => {
        try {
          const r = await fetch("/api/credits", { headers: authHeaders() });
          const d = await r.json();
          if (d.credits > start) { clearInterval(poll); setCredits(d.credits); setTransactions(d.transactions || []); setPurchasing(null); setToast("Credits added!"); setTimeout(() => setToast(""), 3000); }
        } catch {}
      }, 3000);
      setTimeout(() => { clearInterval(poll); setPurchasing(null); }, 360000);
    } catch { setPurchasing(null); }
  };

  const totalPurchased = transactions.reduce((s, t) => s + t.creditsAmount, 0);
  const totalSpent = transactions.reduce((s, t) => s + (t.amountPaid || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {toast && <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-sm font-bold">{toast}</div>}

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Credits</h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">Manage your credits and purchase more</p>
      </div>

      {/* Balance display */}
      <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative">
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-wider">Current Balance</p>
          <p className="text-5xl font-extrabold text-white mt-2 tracking-tight">{credits}</p>
          <p className="text-violet-200/70 text-sm mt-1">credits available &middot; ${(credits / 100).toFixed(2)} value</p>
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-violet-200/50 text-[10px] uppercase tracking-wider font-semibold">Purchased</p>
              <p className="text-white font-bold text-sm">{totalPurchased} credits</p>
            </div>
            <div>
              <p className="text-violet-200/50 text-[10px] uppercase tracking-wider font-semibold">Total Spent</p>
              <p className="text-white font-bold text-sm">${(totalSpent / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing packs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">Buy credits</h2>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">1 credit = $0.01</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {packs.map((pack, i) => (
            <div key={pack.id} className={`relative rounded-2xl overflow-hidden border-2 transition-all hover:shadow-xl ${
              i === 1
                ? "border-violet-500 bg-violet-50 dark:bg-violet-500/[0.06] shadow-lg shadow-violet-500/10"
                : "border-zinc-200 dark:border-white/6 bg-white dark:bg-[#1a1a1a] hover:border-zinc-300 dark:hover:border-violet-500/15"
            }`}>
              {i === 1 && <div className="bg-gradient-to-r from-violet-500 to-violet-600 text-white text-[10px] font-bold text-center py-1.5 tracking-[0.15em] uppercase">Most Popular</div>}
              <div className="p-7 text-center">
                <h3 className="font-bold text-base">{pack.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold">{pack.credits.toLocaleString()}</span>
                  <span className="text-sm text-zinc-400 ml-1.5">credits</span>
                </div>
                <div className="text-xl font-extrabold text-violet-600 dark:text-violet-400 mt-2">{pack.displayPrice}</div>
                <p className="text-xs text-zinc-400 mt-1">{pack.perCredit} per credit</p>
                <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-1">{pack.estimatedGenerations} generations</p>
                <Button
                  className={`w-full mt-5 rounded-xl font-bold h-11 text-sm transition-all ${i === 1 ? "bg-violet-500 hover:bg-violet-600 text-white shadow-sm shadow-violet-500/25" : "bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300"}`}
                  disabled={purchasing !== null}
                  onClick={() => buyPack(pack.id)}
                >
                  {purchasing === pack.id ? "Processing..." : "Buy Now"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-3 text-center">Billed per compute second (0.18 credits/sec). A typical generation uses 5–10 credits. Credits never expire.</p>
      </div>

      {/* How credits work */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/60 dark:border-white/[0.08] rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-sm mb-3">How credits work</h3>
        <ul className="space-y-2.5 text-sm text-zinc-500 dark:text-zinc-400">
          <li className="flex items-start gap-2.5"><span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-violet-500 text-xs font-bold">1</span></span>1 credit = $0.01 — you only pay for actual compute time</li>
          <li className="flex items-start gap-2.5"><span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-violet-500 text-xs font-bold">2</span></span>A typical generation uses 5–10 credits depending on video complexity</li>
          <li className="flex items-start gap-2.5"><span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-violet-500 text-xs font-bold">3</span></span>Credits never expire — buy once, use whenever</li>
          <li className="flex items-start gap-2.5"><span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-violet-500 text-xs font-bold">4</span></span>Exact cost shown after each generation</li>
        </ul>
      </div>

      {/* Transaction history */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/60 dark:border-white/[0.08] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Transaction History</h3>
          {transactions.length > 0 && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p className="text-sm text-zinc-400 font-medium">No transactions yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Purchase a credit pack to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize">{tx.type}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600">{new Date(tx.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{tx.creditsAmount}</p>
                  {tx.amountPaid ? <p className="text-[11px] text-zinc-400 dark:text-zinc-600">${(tx.amountPaid / 100).toFixed(2)}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
