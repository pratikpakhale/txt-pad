"use client";

import { useEffect, useRef, useState } from "react";

const PW_KEY = "txt-pad-pw";

export default function Home() {
  const [password, setPassword] = useState("");
  const [inputPw, setInputPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const [pwError, setPwError] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount, check if password is stored
  useEffect(() => {
    const stored = localStorage.getItem(PW_KEY);
    if (stored) {
      setPassword(stored);
      fetchText(stored);
    }
  }, []);

  async function fetchText(pw: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/text", {
        headers: { "x-password": pw },
      });
      if (res.status === 401) {
        setPwError(true);
        localStorage.removeItem(PW_KEY);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setText(data.text || "");
      setAuthed(true);
      localStorage.setItem(PW_KEY, pw);
    } catch {
      setStatus("error");
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPwError(false);
    await fetchText(inputPw);
    setPassword(inputPw);
  }

  function handleChange(val: string) {
    setText(val);
    setStatus("idle");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveText(val), 800);
  }

  async function saveText(val: string) {
    setStatus("saving");
    try {
      const res = await fetch("/api/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-password": password,
        },
        body: JSON.stringify({ text: val }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  function handleLogout() {
    localStorage.removeItem(PW_KEY);
    setAuthed(false);
    setPassword("");
    setInputPw("");
    setText("");
  }

  // Login screen
  if (!authed) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">📝 txt.pakhale.com</h1>
          <p className="text-zinc-500 text-sm mb-6">Enter your password to access your notes.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              className={`w-full bg-zinc-900 border rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 ${pwError ? "border-red-600" : "border-zinc-800"}`}
              placeholder="Password"
              value={inputPw}
              onChange={(e) => setInputPw(e.target.value)}
              autoFocus
            />
            {pwError && <p className="text-red-400 text-sm">Wrong password.</p>}
            <button
              type="submit"
              disabled={loading || !inputPw}
              className="bg-zinc-100 text-zinc-900 font-semibold rounded-lg py-3 hover:bg-white transition-colors disabled:opacity-40"
            >
              {loading ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Editor
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">📝 txt.pakhale.com</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Synced via Vercel Blob.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${
              status === "saved" ? "bg-green-900 text-green-300" :
              status === "saving" ? "bg-yellow-900 text-yellow-300" :
              status === "error" ? "bg-red-900 text-red-300" :
              "bg-zinc-800 text-zinc-400"
            }`}>
              {status === "saved" ? "✓ Saved" : status === "saving" ? "Saving…" : status === "error" ? "Error" : "Unsaved"}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              Lock
            </button>
          </div>
        </div>

        <textarea
          className="w-full min-h-[75vh] bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-zinc-600 placeholder:text-zinc-600 font-mono"
          placeholder="Start typing… notes auto-save to Vercel Blob."
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
        />
      </div>
    </main>
  );
}
