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
      </footer>
    </main>
  );
}
