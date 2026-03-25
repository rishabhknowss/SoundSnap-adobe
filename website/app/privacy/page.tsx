"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#111]">
      <nav className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-md border-b border-stone-200/60 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-extrabold text-lg">SoundSnap</Link>
          <ThemeToggle />
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-extrabold tracking-tight mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          <p>Last updated: March 2026</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account: email address, name, and password (hashed). When using Google sign-in, we receive your name, email, and profile picture from Google. We also collect usage data including videos processed and credits used.</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">2. How We Use Your Information</h2>
          <p>We use your information to provide the SoundSnap service, process payments, send verification emails, and improve our service. We do not sell your personal information to third parties.</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">3. Video Data</h2>
          <p>Videos uploaded for audio generation are processed by our AI service provider (Fal AI) and are not stored permanently. Generated outputs are temporarily available for download and may be cached for performance.</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">4. Payment Information</h2>
          <p>Payment processing is handled by DodoPayments. We do not store your credit card information. We only store transaction records (amount, date, credits purchased).</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">5. Cookies and Local Storage</h2>
          <p>We use local storage to maintain your authentication session. We use essential cookies for the website to function. We do not use tracking cookies.</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">6. Data Security</h2>
          <p>We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and secure JWT authentication.</p>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">7. Contact</h2>
          <p>For privacy-related questions, contact us at privacy@soundsnap.app.</p>
        </div>
      </div>
    </div>
  );
}
