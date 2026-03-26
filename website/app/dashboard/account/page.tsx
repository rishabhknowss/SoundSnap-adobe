"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User { id: string; email: string; name: string | null; credits: number; activationKey: string | null; emailVerified: boolean; }

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  const getToken = () => localStorage.getItem("soundsnap_token");
  const authHeaders = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }), []);

  useEffect(() => {
    fetch("/api/auth/me", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setUser(d.user))
      .catch(() => {});
  }, []);

  const copyKey = () => {
    if (user?.activationKey) { navigator.clipboard.writeText(user.activationKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const logout = () => { localStorage.removeItem("soundsnap_token"); router.push("/"); };

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Account</h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">Manage your profile and settings</p>
      </div>

      {/* Profile */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/60 dark:border-white/[0.08] rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-amber-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-violet-500/15">
            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.name || "User"}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">{user.email}</p>
              {user.emailVerified && <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[9px] px-1.5">Verified</Badge>}
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-100 dark:border-white/[0.04] pt-4 space-y-3">
          {[
            { l: "Name", v: user.name || "\u2014" },
            { l: "Email", v: user.email },
            { l: "Credits", v: String(user.credits), highlight: true },
          ].map((row) => (
            <div key={row.l} className="flex justify-between items-center py-1.5">
              <span className="text-sm text-zinc-400 dark:text-zinc-500">{row.l}</span>
              <span className={`text-sm font-semibold ${row.highlight ? "text-violet-600 dark:text-violet-400 font-extrabold" : ""}`}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activation Key */}
      {user.activationKey && (
        <div className="bg-violet-50/80 dark:bg-violet-500/[0.06] border border-violet-200/60 dark:border-violet-500/10 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
            <h2 className="font-bold text-sm">Addon Activation Key</h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3 ml-6">Use this key to connect the Adobe Express addon to your account</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-[#111] border-2 border-violet-300/50 dark:border-violet-500/15 px-4 py-2.5 rounded-xl font-mono text-base font-extrabold text-violet-700 dark:text-violet-400 text-center tracking-[0.12em] select-all">{user.activationKey}</code>
            <Button variant="outline" size="sm" onClick={copyKey} className="rounded-xl border-violet-300/50 dark:border-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/10 h-[42px] px-3.5 font-bold text-xs">{copied ? "Copied!" : "Copy"}</Button>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/60 dark:border-white/[0.08] rounded-2xl p-5 mb-5">
        <h2 className="font-bold text-sm mb-4">Setup Instructions</h2>
        <ol className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
          {[
            "Open Adobe Express and search for SoundSnap in add-ons",
            "Copy your activation key from above",
            "Paste it in the addon activation field",
            "Your credits are instantly available to use",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center font-bold text-[11px] text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <a href="https://new.express.adobe.com/" target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/60 dark:border-white/[0.08] rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-500/20 transition-all group flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-500/15 transition-colors">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
          </div>
          <div>
            <p className="font-bold text-sm">Get Adobe Express Addon</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Open Adobe Express</p>
          </div>
        </a>
        <a href="mailto:support@soundsnap.ai" className="bg-white dark:bg-[#1a1a1a] border border-zinc-200/60 dark:border-white/[0.08] rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-500/20 transition-all group flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/15 transition-colors">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>
          </div>
          <div>
            <p className="font-bold text-sm">Help & Support</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Get in touch with us</p>
          </div>
        </a>
      </div>

      {/* Danger zone */}
      <div className="border border-red-200/60 dark:border-red-500/10 rounded-2xl p-5">
        <h2 className="font-bold text-sm text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Irreversible account actions</p>
        <Button variant="outline" onClick={logout} className="rounded-xl border-red-200 dark:border-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 font-bold text-xs h-9 px-4">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
