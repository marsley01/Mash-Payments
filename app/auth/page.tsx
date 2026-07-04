"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({ name, business_name: businessName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed");
        setLoading(false);
        return;
      }

      const supabase = getBrowserSupabase();
      const { error: signInError } = await (supabase.auth as any).signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard?tab=keys");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getBrowserSupabase();
      const { error: signInError } = await (supabase.auth as any).signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            Mash <span style={{ color: "var(--accent)" }}>Payments</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>STK Push Dashboard</p>
        </div>

        <div
          className="rounded-xl border p-1 flex mb-6"
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`btn-apple flex-1 py-2 text-sm font-medium rounded-lg`}
            style={{
              background: mode === "signup" ? "var(--accent)" : "transparent",
              color: mode === "signup" ? "var(--accent-btn-text)" : "var(--text-2)",
            }}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`btn-apple flex-1 py-2 text-sm font-medium rounded-lg`}
            style={{
              background: mode === "login" ? "var(--accent)" : "transparent",
              color: mode === "login" ? "var(--accent-btn-text)" : "var(--text-2)",
            }}
          >
            Login
          </button>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <form onSubmit={mode === "signup" ? handleSignUp : handleLogin} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <input
                    type="text"
                    placeholder="What should we call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                    style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Your shop or website name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                    style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
                  />
                </div>
              </>
            )}
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
              />
            </div>

            {mode === "signup" && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
                Your account gives you a unique API token. You&apos;ll use this token
                to connect any website or app to M-PESA in minutes.
              </p>
            )}

            {error && (
              <p className="text-xs text-[#FF4444]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-apple w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Please wait...
                </span>
              ) : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
