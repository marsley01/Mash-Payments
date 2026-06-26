"use client";

import { useState } from "react";
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

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, business_name: businessName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed");
        setLoading(false);
        return;
      }

      const supabase = getBrowserSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0A0A0A" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Mash <span style={{ color: "#00C896" }}>Payments</span>
          </h1>
          <p className="text-sm text-[#888] mt-1">STK Push Dashboard</p>
        </div>

        <div
          className="rounded-xl border p-1 flex mb-6"
          style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              mode === "signup"
                ? "text-black"
                : "text-[#888] hover:text-white"
            }`}
            style={mode === "signup" ? { background: "#00C896" } : {}}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              mode === "login"
                ? "text-black"
                : "text-[#888] hover:text-white"
            }`}
            style={mode === "login" ? { background: "#00C896" } : {}}
          >
            Login
          </button>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
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
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
                    style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Your shop or website name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
                    style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
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
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
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
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
              />
            </div>

            {mode === "signup" && (
              <p className="text-xs text-[#888] leading-relaxed">
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
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
              style={{ background: "#00C896" }}
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
