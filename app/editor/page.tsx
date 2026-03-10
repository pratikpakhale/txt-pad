"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { deriveKey, encrypt, decrypt } from "@/lib/crypto";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function EditorPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [showDestroy, setShowDestroy] = useState(false);
  const [destroyPw, setDestroyPw] = useState("");
  const [destroyError, setDestroyError] = useState("");
  const [destroying, setDestroying] = useState(false);
  const keyRef = useRef<CryptoKey | null>(null);
  const userRef = useRef<string>("");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const user = sessionStorage.getItem("txt-user");
    const pw = sessionStorage.getItem("txt-pw");
    if (!user || !pw) {
      router.replace("/");
      return;
    }
    userRef.current = user;
    init(user, pw);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init(user: string, pw: string) {
    const key = await deriveKey(pw, user);
    keyRef.current = key;

    const res = await fetch(`/api/notes?user=${encodeURIComponent(user)}`);
    const { data } = await res.json();

    if (data) {
      try {
        const decrypted = await decrypt(data, key);
        setText(decrypted);
        updateWordCount(decrypted);
      } catch {
        sessionStorage.clear();
        router.replace("/");
        return;
      }
    }
    setLoading(false);
  }

  function updateWordCount(t: string) {
    const words = t.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }

  const save = useCallback(async (val: string) => {
    if (!keyRef.current || !userRef.current) return;
    setStatus("saving");
    try {
      const encrypted = await encrypt(val, keyRef.current);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userRef.current, data: encrypted }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, []);

  function handleChange(val: string) {
    setText(val);
    updateWordCount(val);
    setStatus("idle");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(val), 900);
  }

  function handleLogout() {
    sessionStorage.clear();
    router.replace("/");
  }

  async function handleDestroy(e: React.FormEvent) {
    e.preventDefault();
    if (!destroyPw) return;
    setDestroyError("");
    setDestroying(true);

    try {
      // Re-derive key and verify password by decrypting existing notes
      const testKey = await deriveKey(destroyPw, userRef.current);
      const res = await fetch(`/api/notes?user=${encodeURIComponent(userRef.current)}`);
      const { data } = await res.json();

      if (data) {
        try {
          await decrypt(data, testKey);
        } catch {
          setDestroyError("Wrong password.");
          setDestroying(false);
          return;
        }
      }

      // Password verified — delete the blob
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userRef.current }),
      });

      sessionStorage.clear();
      router.replace("/");
    } catch {
      setDestroyError("Something went wrong.");
      setDestroying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <p className="text-[13px] text-white/30">Decrypting your notes…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0c0c0c] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <span className="text-[13px] text-white/50 font-medium">{userRef.current}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/25">{wordCount} {wordCount === 1 ? "word" : "words"}</span>
            <span className="text-white/10">·</span>
            <span className={`text-[12px] font-medium transition-colors ${
              status === "saved" ? "text-emerald-400/70" :
              status === "saving" ? "text-white/30" :
              status === "error" ? "text-red-400/70" :
              "text-white/20"
            }`}>
              {status === "saved" ? "Saved" :
               status === "saving" ? "Saving…" :
               status === "error" ? "Error" : "·"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="text-[12px] text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]"
          >
            Lock
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-8">
        <textarea
          className="flex-1 w-full bg-transparent text-[15px] text-white/80 leading-[1.8] resize-none focus:outline-none placeholder:text-white/15 font-light"
          placeholder="Start writing…"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
          style={{ minHeight: "calc(100vh - 140px)" }}
        />
      </div>

      {/* Bottom hint */}
      <footer className="text-center pb-5">
        <p className="text-[11px] text-white/15 tracking-wide">
          AES-256-GCM · encrypted in your browser · server sees nothing
        </p>
        <button
          onClick={() => { setShowDestroy(true); setDestroyPw(""); setDestroyError(""); }}
          className="mt-3 text-[11px] text-red-900 hover:text-red-500 transition-colors"
        >
          Destroy account
        </button>
      </footer>

      {/* Destroy modal */}
      {showDestroy && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6 z-50">
          <div className="w-full max-w-[340px] bg-[#111] border border-white/[0.08] rounded-2xl p-6">
            <div className="mb-5">
              <p className="text-[13px] font-semibold text-red-400 mb-1">Destroy account</p>
              <p className="text-[13px] text-white/40 leading-relaxed">
                This will permanently delete all your notes and remove your account.
                There is absolutely no recovery.
              </p>
            </div>

            <form onSubmit={handleDestroy} className="flex flex-col gap-3">
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5">
                <p className="text-[11px] text-white/30 mb-0.5">Logged in as</p>
                <p className="text-[13px] text-white/70 font-mono">{userRef.current}</p>
              </div>

              <input
                type="password"
                placeholder="Enter your password to confirm"
                value={destroyPw}
                onChange={(e) => setDestroyPw(e.target.value)}
                autoFocus
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-red-900 transition-all"
              />

              {destroyError && (
                <p className="text-[13px] text-red-400/80 px-1">{destroyError}</p>
              )}

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowDestroy(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] text-white/40 hover:text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={destroying || !destroyPw}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-red-400 bg-red-950/60 hover:bg-red-950 border border-red-900/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {destroying ? "Destroying…" : "Destroy forever"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
