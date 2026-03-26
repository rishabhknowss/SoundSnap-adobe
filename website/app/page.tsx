"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import Folder from "@/components/Folder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

/* ── Eq visualizer bar ── */
function EqBar({ delay, h }: { delay: number; h: number }) {
  return (
    <motion.div
      className="w-[3px] rounded-full bg-violet-500"
      style={{ height: h }}
      animate={{ scaleY: [1, 1.8, 0.6, 1.4, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

/* ── Custom video player ── */
function DemoPlayer() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) ref.current.pause();
    else ref.current.play();
    setPlaying(!playing);
  };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => setProgress(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onEnd = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("ended", onEnd); };
  }, []);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    ref.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="w-full">
      <div className="relative rounded-2xl overflow-hidden bg-black cursor-pointer group" onClick={toggle}>
        <video
          ref={ref}
          src="/vJi_gmuX75breI7r1Sp7l_output_video.mp4"
          className="w-full aspect-video object-cover"
          playsInline
          preload="metadata"
        />
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
          <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
            {playing ? (
              <svg className="w-5 h-5 text-zinc-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg className="w-5 h-5 text-zinc-900 dark:text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" /></svg>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3 px-0.5">
        <div className="flex-1 h-1 bg-zinc-200 dark:bg-white/10 rounded-full cursor-pointer overflow-hidden" onClick={seek}>
          <div className="h-full bg-violet-500 rounded-full transition-[width] duration-100" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-end gap-[2px] h-3.5">
          {playing
            ? [5, 9, 4, 11, 7, 12, 5].map((h, i) => <EqBar key={i} delay={i * 0.07} h={h} />)
            : [5, 9, 4, 11, 7, 12, 5].map((h, i) => <div key={i} className="w-[3px] rounded-full bg-zinc-300 dark:bg-white/15" style={{ height: h * 0.4 }} />)
          }
        </div>
      </div>
    </div>
  );
}

/* ── Auth card for landing page ── */
function AuthCard() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (token) { localStorage.setItem("soundsnap_token", token); router.push("/dashboard"); return; }
    if (params.get("verified") === "true") setMessage("Email verified! You can now log in.");
    if (params.get("error") === "invalid_token") setError("Invalid or expired verification link.");
    if (params.get("error") === "token_expired") setError("Verification link has expired.");
    if (params.get("error") === "oauth_failed") setError("Google sign-in failed. Please try again.");
    if (localStorage.getItem("soundsnap_token")) router.push("/dashboard");
  }, [params, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      localStorage.setItem("soundsnap_token", data.token); router.push("/dashboard");
    } catch { setError("Login failed."); } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMessage(data.message);
    } catch { setError("Registration failed."); } finally { setLoading(false); }
  };

  return (
    <div className="w-full">
      {/* Branding */}
      <div className="text-center mb-8">
        <span className="font-bold text-lg tracking-tight">soundsnap.</span>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">ai audio for your videos</p>
      </div>

      {message && <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-2.5 text-center mb-3">{message}</div>}
      {error && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-2.5 text-center mb-3">{error}</div>}

      {/* Google */}
      <a href="/api/auth/google" className="flex items-center justify-center w-full gap-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/10 transition-all mb-4">
        <svg className="w-4 h-4" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        Continue with Google
      </a>

      <div className="relative mb-4">
        <Separator className="bg-zinc-200 dark:bg-white/8" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FAFAF8] dark:bg-[#111] px-3 text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">or</span>
      </div>

      <Tabs defaultValue="login">
        <TabsList className="w-full bg-zinc-100 dark:bg-white/5 rounded-lg p-0.5 mb-4">
          <TabsTrigger value="login" className="flex-1 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm font-medium text-sm">Log In</TabsTrigger>
          <TabsTrigger value="register" className="flex-1 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm font-medium text-sm">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={handleLogin} className="space-y-3">
            <div><Label className="text-sm font-medium">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 rounded-lg border-zinc-200 dark:border-white/10 dark:bg-white/5 h-10 text-sm" required /></div>
            <div><Label className="text-sm font-medium">Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="mt-1.5 rounded-lg border-zinc-200 dark:border-white/10 dark:bg-white/5 h-10 text-sm" required /></div>
            <Button type="submit" className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg h-10 font-semibold text-sm hover:opacity-90" disabled={loading}>{loading ? "..." : "Log In"}</Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister} className="space-y-3">
            <div><Label className="text-sm font-medium">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5 rounded-lg border-zinc-200 dark:border-white/10 dark:bg-white/5 h-10 text-sm" required /></div>
            <div><Label className="text-sm font-medium">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 rounded-lg border-zinc-200 dark:border-white/10 dark:bg-white/5 h-10 text-sm" required /></div>
            <div><Label className="text-sm font-medium">Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5 rounded-lg border-zinc-200 dark:border-white/10 dark:bg-white/5 h-10 text-sm" minLength={8} required /></div>
            <Button type="submit" className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg h-10 font-semibold text-sm hover:opacity-90" disabled={loading}>{loading ? "..." : "Create Account"}</Button>
          </form>
        </TabsContent>
      </Tabs>

    </div>
  );
}

/* ── Pricing data ── */
const PACKS = [
  { name: "Starter", credits: 500, price: "$4.99", est: "~50–100", pop: false },
  { name: "Creator", credits: 1200, price: "$11.99", est: "~120–240", pop: true },
  { name: "Studio", credits: 3000, price: "$29.99", est: "~300–600", pop: false },
];

/* ══════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <Suspense>
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#111] text-zinc-900 dark:text-zinc-100">

      {/* ── Hero: split layout ── */}
      <section className="min-h-screen flex flex-col lg:flex-row">

        {/* Left — auth card */}
        <div className="lg:w-[400px] xl:w-[440px] shrink-0 flex flex-col justify-center px-8 md:px-12 py-12 lg:py-0 lg:border-r border-zinc-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-6 lg:absolute lg:top-6 lg:left-8 lg:right-auto lg:mb-0">
            <ThemeToggle />
          </div>
          <AuthCard />
        </div>

        {/* Right — video demo */}
        <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 lg:py-0">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <DemoPlayer />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-zinc-400 dark:text-zinc-500 mt-5 text-sm leading-relaxed max-w-md"
          >
            This car had no audio. AI generated the sound in under 30 seconds.
          </motion.p>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-6 md:mx-10 h-px bg-zinc-200 dark:bg-white/[0.06]" />

      {/* ── How it works ── */}
      <section className="px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] font-medium mb-12 text-center">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Step 1 — Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 text-center overflow-hidden"
            >
              <div className="h-36 flex items-center justify-center mb-5">
                <Folder
                  size={1.1}
                  color="#8b5cf6"
                  autoOpen
                  autoInterval={2500}
                />
              </div>
              <div className="text-4xl font-extrabold text-zinc-200 dark:text-zinc-700 mb-1">1</div>
              <h3 className="font-bold text-base mb-1">Upload</h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">Drop your video into the Adobe Express addon.</p>
            </motion.div>

            {/* Step 2 — Generate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 text-center overflow-hidden"
            >
              <div className="h-36 flex items-center justify-center mb-5">
                {/* Animated waveform generation */}
                <div className="flex items-end gap-[3px] h-16">
                  {[8, 16, 6, 22, 12, 26, 10, 20, 14, 28, 8, 18, 24, 10, 16, 22, 12].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-[4px] rounded-full"
                      style={{ height: 4 }}
                      animate={{ height: [4, h, h, 4], backgroundColor: ["#e4e4e7", "#8b5cf6", "#8b5cf6", "#e4e4e7"] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.12,
                        ease: "easeInOut",
                        times: [0, 0.3, 0.7, 1],
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-4xl font-extrabold text-zinc-200 dark:text-zinc-700 mb-1">2</div>
              <h3 className="font-bold text-base mb-1">Generate</h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">AI analyzes your footage and creates matching audio.</p>
            </motion.div>

            {/* Step 3 — Export */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 text-center overflow-hidden"
            >
              <div className="h-36 flex items-center justify-center mb-5">
                <div className="relative">
                  <motion.div
                    className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/15 flex items-center justify-center"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm"
                    animate={{ scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  </motion.div>
                </div>
              </div>
              <div className="text-4xl font-extrabold text-zinc-200 dark:text-zinc-700 mb-1">3</div>
              <h3 className="font-bold text-base mb-1">Export</h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">Add to your Adobe Express canvas or download.</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-6 md:mx-10 h-px bg-zinc-200 dark:bg-white/[0.06]" />

      {/* ── Features ── */}
      <section className="px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
            {[
              { t: "Context-aware", d: "AI reads scenes, motion, and mood to match audio naturally." },
              { t: "Custom prompts", d: "Describe what you want — \"rain on a tin roof\", \"upbeat cafe\" — it delivers." },
              { t: "Inside Adobe Express", d: "No tab-switching. Lives in the addon panel where you already work." },
              { t: "Under a minute", d: "Upload to finished video in under 60 seconds." },
              { t: "Pay per use", d: "No subscriptions. Credits never expire." },
              { t: "Download or canvas", d: "Add to your Express project or download the video with audio." },
            ].map((f, i) => (
              <motion.div
                key={f.t}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <h4 className="font-semibold text-sm mb-1">{f.t}</h4>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 leading-relaxed">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="mx-6 md:mx-10 h-px bg-zinc-200 dark:bg-white/[0.06]" />

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Pay for what you use</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm max-w-lg mx-auto leading-relaxed">
              You&apos;re only charged for actual AI compute time at <span className="font-bold text-zinc-700 dark:text-zinc-200">$0.0018/sec</span>. A typical generation costs 5–10 credits. No subscriptions.
            </p>
          </div>

          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 md:gap-4 max-w-sm sm:max-w-none mx-auto">
            {PACKS.map((pack) => (
              <motion.div
                key={pack.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-xl text-center py-12 px-5 transition-all ${
                  pack.pop
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg"
                    : "bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08]"
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${pack.pop ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}>{pack.name}</p>
                <p className="text-3xl md:text-4xl font-extrabold tracking-tight">{pack.credits.toLocaleString()}</p>
                <p className={`text-xs mt-0.5 ${pack.pop ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}>credits</p>
                <p className={`text-xl font-bold mt-3 ${pack.pop ? "text-violet-400 dark:text-violet-600" : "text-violet-600 dark:text-violet-400"}`}>{pack.price}</p>
                <p className={`text-[11px] mt-1.5 ${pack.pop ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}>{pack.est} generations</p>
                <Link href="/dashboard" className={`block mt-6 rounded-lg font-medium py-2.5 text-xs transition-all ${
                  pack.pop
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:opacity-90"
                    : "bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300"
                }`}>
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Explanation */}
          <div className="mt-10 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-sm font-bold">$0.01</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">per credit</p>
            </div>
            <div>
              <p className="text-sm font-bold">~5–10</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">credits per generation</p>
            </div>
            <div>
              <p className="text-sm font-bold">forever</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">credits never expire</p>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-8 max-w-md mx-auto leading-relaxed">
            Billed per compute second at 0.18 credits/sec. Shorter videos cost less. You always see the exact credits used after each generation.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="mx-6 md:mx-10 h-px bg-zinc-200 dark:bg-white/[0.06]" />
      <footer className="px-6 md:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">soundsnap.</span>
          <span className="text-zinc-200 dark:text-zinc-700">&middot;</span>
          <Link href="/privacy" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Privacy</Link>
          <Link href="/terms" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Terms</Link>
        </div>
        <p className="text-[11px] text-zinc-300 dark:text-zinc-600">&copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
    </Suspense>
  );
}
