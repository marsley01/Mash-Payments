"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";

type Tab = "overview" | "keys" | "install" | "transactions";

interface Profile {
  id: string;
  business_name: string;
  api_token: string;
  setup_step: number;
}

interface Credentials {
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  shortcode: string;
  environment: string;
  callback_url: string;
  is_configured: boolean;
}

interface Transaction {
  id: string;
  phone: string;
  amount: number;
  reference: string | null;
  checkout_request_id: string | null;
  mpesa_receipt: string | null;
  status: string;
  created_at: string;
}

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "\uF1CA" },
  { key: "keys", label: "API Keys Setup", icon: "\uF1C0" },
  { key: "install", label: "Install", icon: "\uF20E" },
  { key: "transactions", label: "Transactions", icon: "\uF267" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as Tab | null;
    if (tabParam && ["overview", "keys", "install", "transactions"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth");
        return;
      }
      setAccessToken(session.access_token);
      setSessionChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth");
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    const headers = { "Authorization": `Bearer ${accessToken}` };
    const [profileRes, credsRes, txRes] = await Promise.all([
      fetch("/api/profile", { headers }),
      fetch("/api/settings", { headers }),
      fetch("/api/transactions", { headers }),
    ]);
    const profileData = await profileRes.json();
    const credsData = await credsRes.json();
    const txData = await txRes.json();

    if (profileData.profile) {
      setProfile(profileData.profile);
      setIsConfigured(profileData.is_configured);
    }
    if (credsData.config) {
      setCredentials(credsData.config);
    }
    if (txData.transactions) {
      setTransactions(txData.transactions);
    }
  }

  useEffect(() => {
    if (!sessionChecked) return;
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [sessionChecked, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (!sessionChecked) {
    return <div className="min-h-screen" style={{ background: "#0A0A0A" }} />;
  }

  const setupStep = profile?.setup_step || 1;
  const isConfiguredBool = isConfigured || (credentials?.is_configured === true);

  return (
    <div className="min-h-screen flex" style={{ background: "#0A0A0A" }}>
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: 190,
          background: "#111111",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h1 className="text-base font-bold tracking-tight">
            Mash <span style={{ color: "#00C896" }}>Payments</span>
          </h1>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            const showDot = t.key === "install" && setupStep < 4;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition text-left"
                style={{
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  color: isActive ? "#ededed" : "#888",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontFamily: "tabler-icons", fontSize: 16 }}>{t.icon}</span>
                <span className="flex-1">{t.label}</span>
                {showDot && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#00C896" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#888", letterSpacing: "0.12em" }}>
            Setup Progress
          </p>
          {[
            { label: "Account created", done: true },
            { label: "Daraja keys saved", done: isConfiguredBool },
            { label: "Installed on your site", done: setupStep >= 3 },
            { label: "Test payment sent", done: setupStep >= 4 },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: step.done ? "#00C896" : "transparent",
                  border: step.done ? "none" : "1.5px solid #555",
                }}
              >
                {step.done ? (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="#0A0A0A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </div>
              <span
                className="text-[11px]"
                style={{ color: step.done ? "#ededed" : "#555" }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="px-2 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-[#FF4444] transition hover:bg-white/[0.03]"
          >
            <span style={{ fontFamily: "tabler-icons", fontSize: 16 }}>{String.fromCharCode(0xEF6B)}</span>
            <span>Settings / Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "100vh" }}>
        {activeTab === "overview" && (
          <OverviewTab
            transactions={transactions}
            setupStep={setupStep}
            onGoTo={(tab) => setActiveTab(tab)}
            isConfigured={isConfiguredBool}
          />
        )}
        {activeTab === "keys" && (
          <KeysTab
            accessToken={accessToken}
            credentials={credentials}
            onSaved={() => {
              fetchAll();
              setTimeout(() => setActiveTab("install"), 1500);
            }}
          />
        )}
        {activeTab === "install" && (
          <InstallTab
            accessToken={accessToken}
            apiToken={profile?.api_token || ""}
            setupStep={setupStep}
            onTestComplete={() => fetchAll()}
          />
        )}
        {activeTab === "transactions" && (
          <TransactionsTab
            transactions={transactions}
            onGoToInstall={() => setActiveTab("install")}
          />
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[2px] h-4 shrink-0" style={{ background: "#00C896" }} />
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "#888", letterSpacing: "0.12em" }}
      >
        {children}
      </span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <p className="text-xs text-[#888] mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: color || "#ededed" }}>
        {value}
      </p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: "#00C896",
    PENDING: "#FFBE32",
    FAILED: "#FF4444",
  };
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: colors[status] || "#888" }}
      />
      <span className="text-sm">{status}</span>
    </div>
  );
}

function OverviewTab({
  transactions,
  setupStep,
  onGoTo,
  isConfigured,
}: {
  transactions: Transaction[];
  setupStep: number;
  onGoTo: (tab: Tab) => void;
  isConfigured: boolean;
}) {
  const totalCount = transactions.length;
  const successfulCount = transactions.filter((t) => t.status === "SUCCESS").length;
  const totalVolume = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const recent = transactions.slice(0, 5);

  let nextStep: { label: string; tab: Tab } | null = null;
  if (!isConfigured) nextStep = { label: "Save your Daraja keys", tab: "keys" };
  else if (setupStep < 4) nextStep = { label: "Send a test payment", tab: "install" };

  return (
    <div className="max-w-4xl space-y-6">
      <SectionLabel>Overview</SectionLabel>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Transactions" value={String(totalCount)} />
        <StatCard label="Successful Payments" value={String(successfulCount)} color="#00C896" />
        <StatCard
          label="Total Volume"
          value={`KES ${totalVolume.toLocaleString()}`}
          color="#00C896"
        />
      </div>

      {nextStep && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: "#111111",
            borderLeft: "3px solid #00C896",
          }}
        >
          <div>
            <p className="text-sm font-semibold">You&apos;re almost ready to accept payments</p>
            <p className="text-xs text-[#888] mt-0.5">Next: {nextStep.label}</p>
          </div>
          <button
            onClick={() => onGoTo(nextStep!.tab)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:brightness-110"
            style={{ background: "#00C896" }}
          >
            Go to {nextStep.tab === "keys" ? "API Keys" : "Install"}
          </button>
        </div>
      )}

      {setupStep >= 4 && (
        <div
          className="rounded-xl border"
          style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-sm font-semibold">Recent Transactions</p>
          </div>
          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#888]">No transactions yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                  <th className="text-left px-4 py-2 font-medium">Phone</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => (
                  <tr key={tx.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <td className="px-4 py-2.5 text-xs text-[#888]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">{tx.phone}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusDot status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function KeysTab({
  accessToken,
  credentials,
  onSaved,
}: {
  accessToken: string;
  credentials: Credentials | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    consumer_key: "",
    consumer_secret: "",
    passkey: "",
    shortcode: "",
    environment: "sandbox",
    callback_url: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (credentials) {
      setForm({
        consumer_key: credentials.consumer_key || "",
        consumer_secret: "",
        passkey: credentials.passkey || "",
        shortcode: credentials.shortcode || "",
        environment: credentials.environment || "sandbox",
        callback_url: credentials.callback_url || "",
      });
    }
  }, [credentials]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consumer_secret && credentials) {
      setMessage("Enter your Consumer Secret to save.");
      setMsgType("error");
      return;
    }
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setMessage("Keys saved. Your payment gateway is active.");
      setMsgType("success");
      onSaved();
    } else {
      setMessage(data.error || "Failed to save");
      setMsgType("error");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionLabel>YOUR DARAJA CREDENTIALS</SectionLabel>

      <p className="text-sm text-[#888] leading-relaxed">
        These are your M-PESA API keys from Safaricom&apos;s developer portal.
        You only need to enter these once. We store them securely and use
        them every time someone pays through your website.
      </p>

      <a
        href="https://developer.safaricom.co.ke"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-[#00C896] hover:underline"
      >
        Don&apos;t have keys yet? &rarr; Get them free from developer.safaricom.co.ke
      </a>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Consumer Key</label>
          <p className="text-[11px] text-[#888] mb-1.5">
            Found in your Safaricom Daraja app under &quot;Consumer Key&quot;
          </p>
          <input
            type="text"
            value={form.consumer_key}
            onChange={(e) => setForm({ ...form, consumer_key: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
            style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Consumer Secret</label>
          <p className="text-[11px] text-[#888] mb-1.5">
            Keep this private. It&apos;s like a password for your payment gateway.
          </p>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={form.consumer_secret}
              onChange={(e) => setForm({ ...form, consumer_secret: e.target.value })}
              required={!credentials}
              placeholder={credentials ? "Leave blank to keep current" : ""}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
              style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white text-xs"
            >
              {showSecret ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Passkey</label>
          <p className="text-[11px] text-[#888] mb-1.5">
            Provided by Safaricom when you create your Daraja app
          </p>
          <div className="relative">
            <input
              type={showPasskey ? "text" : "password"}
              value={form.passkey}
              onChange={(e) => setForm({ ...form, passkey: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
              style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
            />
            <button
              type="button"
              onClick={() => setShowPasskey(!showPasskey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white text-xs"
            >
              {showPasskey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shortcode (Paybill or Till Number)</label>
          <p className="text-[11px] text-[#888] mb-1.5">
            Your M-PESA Paybill or Buy Goods Till number
          </p>
          <input
            type="text"
            value={form.shortcode}
            onChange={(e) => setForm({ ...form, shortcode: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
            style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Environment</label>
          <select
            value={form.environment}
            onChange={(e) => setForm({ ...form, environment: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
            style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
          >
            <option value="sandbox">Sandbox &mdash; Use this for testing. No real money moves.</option>
            <option value="production">Production &mdash; Use this when you&apos;re ready to accept real payments.</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Callback URL</label>
          <p className="text-[11px] text-[#888] mb-1.5">
            Safaricom will send payment confirmations here. Must be a public HTTPS URL.
            Example: https://yourapp.vercel.app/api/callback
          </p>
          <input
            type="url"
            value={form.callback_url}
            onChange={(e) => setForm({ ...form, callback_url: e.target.value })}
            required
            placeholder="https://your-deployed-url.vercel.app/api/callback"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
            style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "#00C896" }}
          >
            {saving ? "Saving..." : "Save My Keys"}
          </button>
          {message && (
            <span className={`text-sm ${msgType === "success" ? "text-[#00C896]" : "text-[#FF4444]"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

const PLATFORMS = ["PHP", "JavaScript", "Python", "WordPress", "React", "cURL"] as const;
type Platform = (typeof PLATFORMS)[number];

function InstallTab({
  accessToken,
  apiToken,
  setupStep,
  onTestComplete,
}: {
  accessToken: string;
  apiToken: string;
  setupStep: number;
  onTestComplete: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>("PHP");
  const [copied, setCopied] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(apiToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = apiToken;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleTestPush(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setTestResult(null);

    const res = await fetch("/api/test-push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({ phone: testPhone, amount: 1 }),
    });

    const data = await res.json();
    setSending(false);

    if (data.success) {
      setTestResult({ ok: true, message: "Prompt sent! Check your phone." });
      onTestComplete();
    } else {
      setTestResult({ ok: false, message: data.error || data.message || "Something went wrong" });
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <SectionLabel>YOUR UNIQUE TOKEN</SectionLabel>

      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <code className="flex-1 text-sm font-mono select-all break-all" style={{ color: "#00C896" }}>
          {apiToken}
        </code>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black shrink-0 transition hover:brightness-110"
          style={{ background: "#00C896" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-[#888] -mt-4">
        This token identifies your account. It&apos;s already included in the
        code snippets below &mdash; you don&apos;t need to edit anything.
      </p>

      <SectionLabel>STEP 1: CHOOSE YOUR PLATFORM</SectionLabel>

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
            style={{
              background: platform === p ? "#00C896" : "transparent",
              color: platform === p ? "#000" : "#888",
              border: platform === p ? "none" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <SnippetBlock platform={platform} apiToken={apiToken} origin={origin} />

      <div
        className="rounded-xl border p-3 text-xs flex items-start gap-2"
        style={{ borderColor: "#FFBE32", background: "rgba(255,190,50,0.05)" }}
      >
        <span style={{ color: "#FFBE32" }}>!</span>
        <span style={{ color: "#FFBE32" }}>
          Make sure your Callback URL in API Keys Setup is set to your deployed URL.
          Safaricom cannot reach localhost.
        </span>
      </div>

      <SectionLabel>STEP 2: SEND A TEST PAYMENT</SectionLabel>

      <p className="text-sm text-[#888]">
        Enter your own phone number to receive a real test prompt on your phone.
        We&apos;ll fire a KES 1 push to confirm everything works.
      </p>

      <form onSubmit={handleTestPush} className="flex items-end gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="0712 345 678"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition focus:border-[#00C896]"
            style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)", color: "#ededed" }}
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50 shrink-0"
          style={{ background: "#00C896" }}
        >
          {sending ? "Sending..." : "Send Test Push"}
        </button>
      </form>

      {testResult && (
        <p
          className={`text-sm ${testResult.ok ? "text-[#00C896]" : "text-[#FF4444]"}`}
        >
          {testResult.ok && ""}
          {testResult.message}
        </p>
      )}
    </div>
  );
}

function SnippetBlock({ platform, apiToken, origin }: { platform: Platform; apiToken: string; origin: string }) {
  const snippets = getSnippets(platform, apiToken, origin);
  return (
    <div className="space-y-4">
      {snippets.map((snippet, i) => (
        <div key={i}>
          <p className="text-xs text-[#888] mb-2">{snippet.label}</p>
          <pre
            className="rounded-xl border p-4 text-xs font-mono leading-relaxed overflow-x-auto"
            style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <code>{snippet.code}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}

function getSnippets(platform: Platform, token: string, origin: string) {
  const url = origin || "https://your-deployed-url.vercel.app";

  const all: Record<Platform, { label: string; code: string }[]> = {
    PHP: [
      {
        label: "Paste this once into your project",
        code: `<?php
function mash_stk_push($phone, $amount, $reference) {
    $response = file_get_contents(
        "${url}/api/stkpush",
        false,
        stream_context_create([
            "http" => [
                "method"  => "POST",
                "header"  => "Content-Type: application/json\\r\\n" .
                             "x-token: ${token}\\r\\n",
                "content" => json_encode([
                    "phone"     => $phone,
                    "amount"    => $amount,
                    "reference" => $reference
                ])
            ]
        ])
    );
    return json_decode($response, true);
}`,
      },
      {
        label: "Then call it in your checkout like this",
        code: `// In your checkout page
$result = mash_stk_push("0712345678", 1500, "Order-" . $order_id);

if ($result["success"]) {
    echo "Payment prompt sent! Ask the customer to check their phone.";
} else {
    echo "Something went wrong: " . $result["error"];
}`,
      },
    ],
    JavaScript: [
      {
        label: "Paste this once into your project",
        code: `async function mashStkPush(phone, amount, reference) {
    const response = await fetch("${url}/api/stkpush", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-token": "${token}"
        },
        body: JSON.stringify({ phone, amount, reference })
    });
    return await response.json();
}`,
      },
      {
        label: "Then call it in your checkout like this",
        code: `// Call it when the customer clicks Pay
const result = await mashStkPush("0712345678", 1500, "Order-123");

if (result.success) {
    showMessage("Check your phone for the M-PESA prompt!");
} else {
    showError(result.error);
}`,
      },
    ],
    Python: [
      {
        label: "Paste this once into your project",
        code: `# Install requests first: pip install requests
import requests

def mash_stk_push(phone, amount, reference):
    response = requests.post(
        "${url}/api/stkpush",
        headers={
            "Content-Type": "application/json",
            "x-token": "${token}"
        },
        json={
            "phone": phone,
            "amount": amount,
            "reference": reference
        }
    )
    return response.json()`,
      },
      {
        label: "Then call it in your checkout like this",
        code: `# Call it from your checkout view or route
result = mash_stk_push("0712345678", 1500, "Order-123")

if result.get("success"):
    print("Prompt sent! Customer should check their phone.")
else:
    print("Error:", result.get("error"))`,
      },
    ],
    WordPress: [
      {
        label: "Paste this once into your project",
        code: `<?php
// Add this to your theme's functions.php file
// or to a custom plugin file

function mash_stk_push($phone, $amount, $reference) {
    $response = wp_remote_post("${url}/api/stkpush", [
        "headers" => [
            "Content-Type" => "application/json",
            "x-token"      => "${token}"
        ],
        "body"    => wp_json_encode([
            "phone"     => $phone,
            "amount"    => $amount,
            "reference" => $reference
        ])
    ]);
    return json_decode(wp_remote_retrieve_body($response), true);
}`,
      },
      {
        label: "Then call it in your checkout like this",
        code: `// Hook into WooCommerce checkout — add to functions.php
add_action("woocommerce_checkout_order_processed", function($order_id) {
    $order = wc_get_order($order_id);
    $phone = $order->get_billing_phone();
    $total = $order->get_total();

    $result = mash_stk_push($phone, $total, "WC-" . $order_id);

    if ($result["success"]) {
        $order->add_order_note("M-PESA prompt sent to " . $phone);
    }
});`,
      },
    ],
    React: [
      {
        label: "Paste this once into your project",
        code: `// Create a file: lib/mash.js
// Import and use it anywhere in your React project

export async function mashStkPush(phone, amount, reference) {
    const res = await fetch("${url}/api/stkpush", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-token": "${token}"
        },
        body: JSON.stringify({ phone, amount, reference })
    });

    if (!res.ok) throw new Error("STK Push failed");
    return res.json();
}`,
      },
      {
        label: "Then call it in your checkout like this",
        code: `// In your checkout component
import { mashStkPush } from "@/lib/mash";

function CheckoutButton({ phone, total, orderId }) {
    const [status, setStatus] = useState("");

    const handlePay = async () => {
        setStatus("Sending prompt...");
        const result = await mashStkPush(phone, total, "Order-" + orderId);
        setStatus(result.success
            ? "Check your phone for the M-PESA prompt!"
            : "Error: " + result.error
        );
    };

    return (
        <div>
            <button onClick={handlePay}>Pay with M-PESA</button>
            {status && <p>{status}</p>}
        </div>
    );
}`,
      },
    ],
    cURL: [
      {
        label: "No setup needed. Run this in your terminal to test instantly.",
        code: `curl -X POST ${url}/api/stkpush \\
  -H "Content-Type: application/json" \\
  -H "x-token: ${token}" \\
  -d '{
    "phone": "0712345678",
    "amount": 1,
    "reference": "TEST-001"
  }'`,
      },
      {
        label: "Expected response when it works:",
        code: `// { "success": true, "checkout_request_id": "ws_CO_...", "message": "STK Push sent." }

// If you see this, your integration is working perfectly.
// Now replace the cURL with your platform's snippet above.`,
      },
    ],
  };

  return all[platform];
}

function TransactionsTab({
  transactions,
  onGoToInstall,
}: {
  transactions: Transaction[];
  onGoToInstall: () => void;
}) {
  return (
    <div className="max-w-5xl space-y-6">
      <SectionLabel>Transactions</SectionLabel>

      {transactions.length === 0 ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-16"
          style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontFamily: "tabler-icons", fontSize: 40, color: "#555" }}>
            {String.fromCharCode(0xF025)}
          </span>
          <p className="text-lg font-semibold mt-3" style={{ color: "#888" }}>
            No transactions yet
          </p>
          <p className="text-sm text-[#555] mt-1 max-w-sm text-center">
            Head to the Install tab, copy your snippet, and make your
            first test payment to see it appear here.
          </p>
          <button
            onClick={onGoToInstall}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:brightness-110"
            style={{ background: "#00C896" }}
          >
            Go to Install
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#888] text-xs" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-right px-4 py-3 font-medium">Amount (KES)</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">M-PESA Receipt</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-t text-sm"
                    style={{ borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    <td className="px-4 py-3 text-xs text-[#888] whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{tx.phone}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{tx.reference || "\u2014"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{tx.mpesa_receipt || "\u2014"}</td>
                    <td className="px-4 py-3">
                      <StatusDot status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
