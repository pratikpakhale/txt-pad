"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deriveKey, decrypt } from "@/lib/crypto";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "deriving">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    setStep("deriving");

    try {
      const key = await deriveKey(password, username.trim());
      const res = await fetch(`/api/notes?user=${encodeURIComponent(username.trim())}`);
      const { data } = await res.json();

      if (data) {
        // Existing user — try to decrypt
        try {
          await decrypt(data, key);
        } catch {
          setError("Wrong password. No way to recover.");
          setLoading(false);
          setStep("idle");
          return;
        }
      }

      // Store session
      sessionStorage.setItem("txt-user", username.trim());
      sessionStorage.setItem("txt-pw", password);
      router.push("/editor");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
      setStep("idle");
    }
  }

  return (
    <main className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold text-white tracking-tight">txt.pakhale.com</h1>
          <p className="text-[13px] text-white/35 mt-1.5 leading-relaxed">
            End-to-end encrypted notes.<br />Your password is your key — no recovery possible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-400/80 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="mt-1 w-full bg-white text-[#0c0c0c] rounded-xl py-3 text-[14px] font-semibold hover:bg-white/90 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {loading
              ? step === "deriving"
                ? "Deriving key…"
                : "Unlocking…"
              : "Continue →"}
          </button>
        </form>

        <p className="text-[12px] text-white/20 text-center mt-8 leading-relaxed">
          New user? Just enter a username and password.<br />
          No account creation needed.
        </p>
      </div>
    </main>
  );
}
