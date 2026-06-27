"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTheme } from "@/lib/theme-context";

type Tab = "overview" | "keys" | "install" | "transactions";

interface Profile {
  id: string;
  business_name: string;
  api_token: string;
  setup_step: number;
  role?: string;
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
  { key: "overview", label: "Overview", icon: "ti-layout-dashboard" },
  { key: "keys", label: "API Keys Setup", icon: "ti-key" },
  { key: "install", label: "Install", icon: "ti-code" },
  { key: "transactions", label: "Transactions", icon: "ti-file-invoice" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
    return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;
  }

  const setupStep = profile?.setup_step || 1;
  const isConfiguredBool = isConfigured || (credentials?.is_configured === true);

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: 190,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <h1 className="text-base font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
            Mash <span style={{ color: "var(--accent)" }}>Payments</span>
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
                className="btn-apple w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition text-left"
                style={{
                  background: isActive ? "var(--toggle-active)" : "transparent",
                  color: isActive ? "var(--text-1)" : "var(--text-2)",
                }}
              >
                <i className={`ti ${t.icon}`} style={{ fontSize: 16 }}></i>
                <span className="flex-1">{t.label}</span>
                {showDot && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

          {profile?.role === "admin" && (
            <div className="px-2">
              <button
                onClick={() => router.push("/admin")}
                className="btn-apple w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition text-left"
                style={{ color: "var(--text-2)" }}
              >
                <i className="ti ti-shield" style={{ fontSize: 16 }}></i>
                <span className="flex-1">Admin Panel</span>
              </button>
            </div>
          )}

        <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)", letterSpacing: "0.12em" }}>
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
                  background: step.done ? "var(--accent)" : "transparent",
                  border: step.done ? "none" : "1.5px solid var(--text-3)",
                }}
              >
                {step.done ? (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="var(--accent-btn-text)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </div>
              <span
                className="text-[11px]"
                style={{ color: step.done ? "var(--text-1)" : "var(--text-3)" }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="px-2 py-3 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={toggleTheme}
            className="btn-apple w-full flex items-center gap-2 px-3 py-2 rounded-full text-[11px]"
            style={{
              background: "var(--toggle-bg)",
              border: "0.5px solid var(--border-input)",
              color: "var(--text-2)",
            }}
          >
            {theme === "dark"
              ? <><i className="ti ti-sun" style={{ fontSize: 14 }} /> Light mode</>
              : <><i className="ti ti-moon" style={{ fontSize: 14 }} /> Dark mode</>
            }
          </button>
          <button
            onClick={handleLogout}
            className="btn-apple w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ color: "var(--text-2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-2)"; }}
          >
            <i className="ti ti-settings" style={{ fontSize: 16 }}></i>
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
            accessToken={accessToken}
          />
        )}
        {activeTab === "keys" && (
          <KeysTab
            accessToken={accessToken}
            credentials={credentials}
            onSaved={() => fetchAll()}
            onGoToInstall={() => setActiveTab("install")}
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
    </ErrorBoundary>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[2px] h-4 shrink-0" style={{ background: "#00C896" }} />
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-2)", letterSpacing: "0.12em" }}
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
      style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-2)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: color || "var(--text-1)" }}>
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
        style={{ background: colors[status] || "var(--text-2)" }}
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
  accessToken,
}: {
  transactions: Transaction[];
  setupStep: number;
  onGoTo: (tab: Tab) => void;
  isConfigured: boolean;
  accessToken: string;
}) {
  const totalCount = transactions.length;
  const successfulCount = transactions.filter((t) => t.status === "SUCCESS").length;
  const totalVolume = transactions
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const successRate = totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

  const pendingCount = transactions.filter((t) => t.status === "PENDING").length;
  const hasStuckPending = pendingCount > 0 && isConfigured;
  const recent = transactions.slice(0, 10);

  const [playPhone, setPlayPhone] = useState("");
  const [playAmount, setPlayAmount] = useState("1");
  const [sending, setSending] = useState(false);
  const [playResult, setPlayResult] = useState<{ ok: boolean; message: string } | null>(null);

  let nextStep: { label: string; tab: Tab } | null = null;
  if (!isConfigured) nextStep = { label: "Save your Daraja keys", tab: "keys" };
  else if (setupStep < 4) nextStep = { label: "Send a test payment", tab: "install" };

  async function handlePlaygroundPush(e: React.FormEvent) {
    e.preventDefault();
    if (!playPhone) return;
    setSending(true);
    setPlayResult(null);
    try {
      const res = await fetch("/api/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ phone: playPhone, amount: Number(playAmount) || 1 }),
      });
      const data = await res.json();
      setPlayResult(
        data.success
          ? { ok: true, message: "Prompt sent! Check your phone for the M-PESA SIM push." }
          : { ok: false, message: data.error || data.message || "Push failed — verify your Daraja keys" }
      );
    } catch {
      setPlayResult({ ok: false, message: "Network error. Try again." });
    } finally {
      setSending(false);
    }
  }

  const webhookStatus = !isConfigured
    ? { label: "Unconfigured", color: "var(--text-2)", bg: "var(--toggle-bg)" }
    : hasStuckPending
      ? { label: "Warning", color: "#F59E0B", bg: "#F59E0B15" }
      : { label: "Healthy", color: "#00C896", bg: "#00C89615" };

  function statusContext(status: string): string {
    switch (status) {
      case "PENDING":
        return "Awaiting User PIN entry...";
      case "FAILED":
        return "Payment declined by user or network";
      case "SUCCESS":
        return "Callback received and verified";
      default:
        return "";
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <SectionLabel>Overview</SectionLabel>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Transactions" value={String(totalCount)} />
        <StatCard
          label="Successful Payments"
          value={successRate > 0 ? `${successfulCount} (${successRate}%)` : String(successfulCount)}
          color="var(--accent)"
        />
        <StatCard
          label="Total Volume"
          value={`KES ${totalVolume.toLocaleString()}`}
          color="var(--accent)"
        />
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--text-2)" }}>Client Webhook Health</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold" style={{ color: webhookStatus.color }}>
              {webhookStatus.label}
            </p>
            {hasStuckPending && (
              <span className="text-[10px] font-mono font-medium" style={{ color: "#FF4444" }}>
                Unreachable
              </span>
            )}
            {isConfigured && !hasStuckPending && (
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                {totalCount > 0 ? `${successRate}% delivery` : "Awaiting traffic"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Next Step Banner */}
      {nextStep && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: "var(--sidebar)",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>You&apos;re almost ready to accept payments</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>Next: {nextStep.label}</p>
          </div>
          <button
            onClick={() => onGoTo(nextStep!.tab)}
            className="btn-apple px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
          >
            Go to {nextStep.tab === "keys" ? "API Keys" : "Install"}
          </button>
        </div>
      )}

      {/* Diagnostic Warning */}
      {hasStuckPending && (
        <div
          className="rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ background: "#F59E0B10", border: "1px solid #F59E0B30" }}
        >
          <div className="flex items-start gap-3">
            <i className="ti ti-alert-triangle" style={{ color: "#F59E0B", fontSize: 18, marginTop: 2, flexShrink: 0 }}></i>
            <div>
              <p className="text-sm font-bold" style={{ color: "#F59E0B" }}>Integration Status Alert: Stuck Webhooks Detected</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-2)" }}>
                Your test transactions are remaining <strong>PENDING</strong> because your local checkout environment may not be receiving Safaricom&apos;s server callbacks. Ensure your webhook listener URL matches your deployed host.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onGoTo("install")}
              className="btn-apple text-xs font-semibold py-2 px-3.5 rounded-lg transition"
              style={{ background: "var(--toggle-bg)", border: "0.5px solid var(--border-input)", color: "var(--text-1)" }}
            >
              Test Connection
            </button>
            <button
              onClick={() => onGoTo("keys")}
              className="btn-apple text-xs font-semibold py-2 px-3.5 rounded-lg transition"
              style={{ background: "#F59E0B", color: "#0A0A0A" }}
            >
              Fix Webhook URL
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Transactions Table */}
        <div
          className="lg:col-span-2 rounded-xl border flex flex-col"
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Recent Transactions</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>Real-time STK prompts mapped to customer checkout attempts</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--toggle-bg)", color: "var(--text-2)" }}>
              {totalCount} {totalCount === 1 ? "entry" : "entries"}
            </span>
          </div>

          {recent.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <i className="ti ti-device-mobile" style={{ fontSize: 36, color: "var(--text-3)" }}></i>
                <p className="text-sm mt-2" style={{ color: "var(--text-2)" }}>No transactions yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  {isConfigured ? "Use the playground to send your first test STK push" : "Complete your API key setup first"}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs" style={{ color: "var(--text-2)", borderColor: "var(--border)" }}>
                    <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider">Time</th>
                    <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider">Phone</th>
                    <th className="text-right px-5 py-3 font-semibold text-[11px] uppercase tracking-wider">Amount</th>
                    <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3 font-semibold text-[11px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tx) => (
                    <tr key={tx.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-2)" }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "var(--text-1)" }}>
                        {tx.phone}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold" style={{ color: "var(--text-1)" }}>
                        KES {Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                            style={{
                              background: tx.status === "SUCCESS" ? "#00C89615" : tx.status === "PENDING" ? "#F59E0B15" : "#FF444415",
                              color: tx.status === "SUCCESS" ? "#00C896" : tx.status === "PENDING" ? "#F59E0B" : "#FF4444",
                              border: `1px solid ${
                                tx.status === "SUCCESS" ? "#00C89630" : tx.status === "PENDING" ? "#F59E0B30" : "#FF444430"
                              }`,
                            }}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${tx.status === "PENDING" ? "animate-pulse" : ""}`}
                              style={{
                                background: tx.status === "SUCCESS" ? "#00C896" : tx.status === "PENDING" ? "#F59E0B" : "#FF4444",
                              }}
                            />
                            {tx.status}
                          </span>
                          {tx.status !== "SUCCESS" && (
                            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                              {statusContext(tx.status)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className="btn-apple text-[10px] font-semibold py-1 px-2.5 rounded border transition"
                          style={{ background: "var(--toggle-bg)", borderColor: "var(--border-input)", color: "var(--text-2)" }}
                          title="Repush STK Prompt"
                        >
                          Repush
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div
            className="px-5 py-3 border-t text-xs flex items-center justify-between"
            style={{ background: "var(--toggle-bg)", borderColor: "var(--border)" }}
          >
            <span style={{ color: "var(--text-3)" }}>Stuck with pending transactions?</span>
            <button
              onClick={() => onGoTo("install")}
              className="font-semibold flex items-center gap-1 transition"
              style={{ color: "var(--accent)" }}
            >
              Read the Integration Webhook Guide
              <i className="ti ti-chevron-right" style={{ fontSize: 12 }} />
            </button>
          </div>
        </div>

        {/* Playground */}
        <div
          className="lg:col-span-1 rounded-xl border p-5 flex flex-col"
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-1)" }}>Instant Checkout Playground</h3>
            <p className="text-xs mt-0.5 mb-5" style={{ color: "var(--text-2)" }}>
              Validate your configuration by sending a test STK push immediately.
            </p>

            <form onSubmit={handlePlaygroundPush} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>
                  Your Mobile Phone
                </label>
                <input
                  type="text"
                  placeholder="0712 345 678"
                  value={playPhone}
                  onChange={(e) => setPlayPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none transition"
                  style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>
                  Charge Amount (KES)
                </label>
                <input
                  type="number"
                  min="1"
                  value={playAmount}
                  onChange={(e) => setPlayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none transition"
                  style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !isConfigured}
                className="btn-apple w-full font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                style={{ background: isConfigured ? "var(--accent)" : "var(--toggle-bg)", color: isConfigured ? "var(--accent-btn-text)" : "var(--text-3)", border: isConfigured ? "none" : "0.5px solid var(--border-input)" }}
              >
                {sending ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full animate-spin block" style={{ border: "1.5px solid currentColor", borderTopColor: "transparent" }} />
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="ti ti-bolt" style={{ fontSize: 14 }} />
                    Dispatch Interactive Prompt
                  </>
                )}
              </button>
            </form>
          </div>

          {playResult && (
            <div
              className="rounded-xl px-3 py-2.5 mt-4 flex items-start gap-2 animate-fade-up"
              style={{
                background: playResult.ok ? "rgba(0,200,150,0.08)" : "rgba(255,68,68,0.08)",
                border: `1px solid ${playResult.ok ? "var(--accent)" : "#FF4444"}`,
              }}
            >
              <i className={`ti ${playResult.ok ? "ti-circle-check" : "ti-alert-circle"}`} style={{ color: playResult.ok ? "var(--accent)" : "#FF4444", fontSize: 14, marginTop: 1 }}></i>
              <p className="text-xs" style={{ color: playResult.ok ? "var(--accent)" : "#FF4444" }}>
                {playResult.message}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function KeysTab({
  accessToken,
  credentials,
  onSaved,
  onGoToInstall,
}: {
  accessToken: string;
  credentials: Credentials | null;
  onSaved: () => void;
  onGoToInstall: () => void;
}) {
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [shortcode, setShortcode] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showPasskey, setShowPasskey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [keysJustSaved, setKeysJustSaved] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const hasExistingKeys = !!(credentials?.consumer_key);

  useEffect(() => {
    if (credentials) {
      setConsumerKey(credentials.consumer_key || "");
      setEnvironment((credentials.environment as "sandbox" | "production") || "sandbox");
      if (credentials.environment === "production") {
        setShortcode(credentials.shortcode || "");
        setPasskey(credentials.passkey || "");
      }
    }
  }, [credentials]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!consumerKey || (!consumerSecret && !credentials)) {
      setMessage("Consumer Key and Secret are required.");
      setMsgType("error");
      return;
    }
    if (environment === "production" && (!shortcode || !passkey)) {
      setMessage("Shortcode and Passkey are required for live mode.");
      setMsgType("error");
      return;
    }
    setSaving(true);
    setMessage("");

    const callbackUrl = window.location.origin + "/api/callback";

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret || undefined,
        environment,
        shortcode: environment === "sandbox" ? "174379" : shortcode,
        passkey: environment === "sandbox" ? "__SANDBOX__" : passkey,
        callback_url: callbackUrl,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setMessage("Gateway activated successfully");
      setMsgType("success");
      setKeysJustSaved(true);
      onSaved();
    } else {
      setMessage(data.error || "Failed to save");
      setMsgType("error");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionLabel>YOUR DARAJA CREDENTIALS</SectionLabel>

      {/* Section Header */}
      <div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Connect your proprietary Safaricom developer apps. We securely encrypt and store your credentials, handling all OAuth token requests automatically.
        </p>
        <a
          href="https://developer.safaricom.co.ke"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm hover:underline mt-2"
          style={{ color: "var(--accent)" }}
        >
          Don&apos;t have keys yet? &rarr; Get them free from developer.safaricom.co.ke
        </a>
      </div>

      {/* Dual-Environment Tab Selector */}
      <div
        className="rounded-xl p-1.5 grid grid-cols-2 gap-2 border"
        style={{ background: "var(--toggle-bg)", borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => setEnvironment("sandbox")}
          className="btn-apple text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
          style={{
            background: environment === "sandbox" ? "var(--card)" : "transparent",
            color: environment === "sandbox" ? "var(--accent)" : "var(--text-2)",
            boxShadow: environment === "sandbox" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: environment === "sandbox" ? "var(--accent)" : "var(--text-3)" }} />
          Sandbox Mode (Testing)
        </button>
        <button
          type="button"
          onClick={() => setEnvironment("production")}
          className="btn-apple text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
          style={{
            background: environment === "production" ? "var(--card)" : "transparent",
            color: environment === "production" ? "var(--text-1)" : "var(--text-2)",
            boxShadow: environment === "production" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: environment === "production" ? "#F59E0B" : "var(--text-3)" }} />
          Live Mode (Production)
        </button>
      </div>

      {/* Environment Context Banner */}
      {environment === "sandbox" ? (
        <div
          className="rounded-xl p-4 text-xs leading-relaxed flex items-start gap-3"
          style={{ background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.15)" }}
        >
          <i className="ti ti-info-circle" style={{ color: "var(--accent)", fontSize: 16, marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="font-bold" style={{ color: "var(--accent)" }}>Sandbox Environment Selected</p>
            <p className="mt-0.5" style={{ color: "var(--text-2)" }}>
              Test transactions do not move real currency. We automatically supply the test Paybill shortcode (<span className="font-mono font-bold" style={{ color: "var(--accent)" }}>174379</span>) and Passkey behind the scenes.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 text-xs leading-relaxed flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <i className="ti ti-alert-triangle" style={{ color: "#F59E0B", fontSize: 16, marginTop: 1, flexShrink: 0 }} />
          <div>
            <p className="font-bold" style={{ color: "#F59E0B" }}>Live Mode Selected — Real Money Will Move</p>
            <p className="mt-0.5" style={{ color: "var(--text-2)" }}>
              You need your own Paybill/Till shortcode and Passkey from Safaricom. Double-check your credentials before saving — incorrect keys will cause payment failures for your customers.
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Consumer Key */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Consumer Key</label>
            {hasExistingKeys && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,200,150,0.1)", color: "var(--accent)" }}>
                <i className="ti ti-circle-check" style={{ fontSize: 11 }} />
                Validated
              </span>
            )}
          </div>
          <input
            type="text"
            value={consumerKey}
            onChange={(e) => setConsumerKey(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition"
            style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
          />
          <p className="text-[10px] leading-normal" style={{ color: "var(--text-3)" }}>
            Retrieve this string directly from your selected App item inside the{" "}
            <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>
              Safaricom Developer Portal
            </a>.
          </p>
        </div>

        {/* Consumer Secret */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Consumer Secret</label>
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="text-[10px] font-semibold transition"
              style={{ color: "var(--text-3)" }}
            >
              {showSecret ? "Hide Secret" : "Show Secret"}
            </button>
          </div>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required={!credentials}
              placeholder={credentials ? "Leave blank to keep current" : ""}
              className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition"
              style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
            />
          </div>
          <p className="text-[10px] leading-normal" style={{ color: "var(--text-3)" }}>
            Treat this like a system password — keep it strictly private to prevent unauthorized transaction initiation attempts.
          </p>
        </div>

        {/* Production Fields */}
        {environment === "production" && (
          <div className="space-y-4 rounded-xl border p-5" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Shortcode</label>
              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>Your M-PESA Paybill or Buy Goods Till number</p>
              <input
                type="text"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition"
                style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Passkey</label>
              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>Provided by Safaricom with your production credentials</p>
              <div className="relative">
                <input
                  type={showPasskey ? "text" : "password"}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition"
                  style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] transition"
                  style={{ color: "var(--text-3)" }}
                >
                  {showPasskey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-apple px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-btn-text)", minWidth: 180 }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Saving...
              </span>
            ) : "Save & Activate Gateway"}
          </button>
          {message && (
            <span className="text-sm animate-fade-up" style={{ color: msgType === "success" ? "var(--accent)" : "#FF4444" }}>
              {message}
            </span>
          )}
        </div>
      </form>

      {/* Already Configured Card */}
      {(keysJustSaved || (credentials?.is_configured && !keysJustSaved)) && (
        <div className={`rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${keysJustSaved ? "animate-scale-in" : ""}`} style={{ background: "var(--sidebar)", border: "1px solid var(--accent)" }}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(0,200,150,0.12)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <i className="ti ti-circle-check" style={{ color: "var(--accent)", fontSize: 20 }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>
                {keysJustSaved ? "Gateway Activated" : "Already Configured"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
                {keysJustSaved ? "Your Daraja keys are saved and ready to go." : "Your credentials match successfully. You can run immediate simulation checkout loops or continue setup installation steps."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                const el = document.getElementById("test-section");
                el?.classList.toggle("hidden");
              }}
              className="btn-apple flex-1 md:flex-initial text-xs font-semibold py-2 px-4 rounded-xl border transition"
              style={{ background: "var(--toggle-bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
            >
              Test Connection
            </button>
            <button
              onClick={onGoToInstall}
              className="btn-apple flex-1 md:flex-initial text-xs font-semibold py-2 px-4 rounded-xl transition"
              style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
            >
              Continue to Install
            </button>
          </div>
        </div>
      )}

      {/* Test Section */}
      {keysJustSaved || credentials?.is_configured ? (
        <div id="test-section" className="hidden space-y-4 animate-fade-up">
          <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16 }}>
            <p className="text-xs" style={{ color: "var(--text-2)" }}>
              Enter your phone number. We&apos;ll send a real KES 1 STK push prompt to confirm your Daraja keys are working correctly.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setTesting(true);
                setTestResult(null);
                try {
                  const res = await fetch("/api/test-push", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                    body: JSON.stringify({ phone: testPhone, amount: 1 }),
                  });
                  const data = await res.json();
                  setTestResult(
                    data.success
                      ? { ok: true, message: "STK push sent! Check your phone for the M-PESA prompt." }
                      : { ok: false, message: data.error || data.message || "Push failed — check your Daraja keys" }
                  );
                } catch {
                  setTestResult({ ok: false, message: "Network error. Try again." });
                } finally {
                  setTesting(false);
                }
              }}
              className="flex items-center gap-3 mt-4"
            >
              <input
                type="text"
                placeholder="e.g. 0712 345 678"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                required
                className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none transition"
                style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
              />
              <button
                type="submit"
                disabled={testing}
                className="btn-apple px-5 py-2.5 rounded-xl text-sm font-semibold shrink-0"
                style={{ background: "var(--accent)", color: "var(--accent-btn-text)", minWidth: 140 }}
              >
                {testing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Sending...
                  </span>
                ) : "Send Test Push"}
              </button>
            </form>

            {testResult && (
              <div className="animate-fade-up mt-4">
                <div
                  className="rounded-xl px-4 py-3 flex items-start gap-2"
                  style={{
                    background: testResult.ok ? "rgba(0,200,150,0.08)" : "rgba(255,68,68,0.08)",
                    border: `1px solid ${testResult.ok ? "var(--accent)" : "#FF4444"}`,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{testResult.ok ? "✓" : "✗"}</span>
                  <p className="text-sm font-medium" style={{ color: testResult.ok ? "var(--accent)" : "#FF4444" }}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
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
        style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <code className="flex-1 text-sm font-mono select-all break-all" style={{ color: "var(--accent)" }}>
          {apiToken}
        </code>
        <button
          onClick={handleCopy}
          className="btn-apple px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs -mt-4" style={{ color: "var(--text-2)" }}>
        This token identifies your account. It&apos;s already included in the
        code snippets below &mdash; you don&apos;t need to edit anything.
      </p>

      <SectionLabel>STEP 1: CHOOSE YOUR PLATFORM</SectionLabel>

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className="btn-apple px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: platform === p ? "var(--accent)" : "transparent",
              color: platform === p ? "var(--accent-btn-text)" : "var(--text-2)",
              border: platform === p ? "none" : "1px solid var(--border-input)",
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

      <p className="text-sm" style={{ color: "var(--text-2)" }}>
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
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition"
            style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="btn-apple px-5 py-2 rounded-lg text-sm font-semibold shrink-0"
          style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Sending...
            </span>
          ) : "Send Test Push"}
        </button>
      </form>

      {testResult && (
        <p
          className="text-sm"
          style={{ color: testResult.ok ? "var(--accent)" : "#FF4444" }}
        >
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
          <p className="text-xs mb-2" style={{ color: "var(--text-2)" }}>{snippet.label}</p>
          <pre
            className="rounded-xl border p-4 text-xs font-mono leading-relaxed overflow-x-auto"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-1)" }}
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
                "header"  => "Content-Type: application/json\\\\r\\\\n" .
                             "x-token: ${token}\\\\r\\\\n",
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
        code: `curl -X POST ${url}/api/stkpush \\\\
  -H "Content-Type: application/json" \\\\
  -H "x-token: ${token}" \\\\
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
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <i className="ti ti-device-mobile" style={{ fontSize: 40, color: "var(--text-3)" }}></i>
          <p className="text-lg font-semibold mt-3" style={{ color: "var(--text-2)" }}>
            No transactions yet
          </p>
          <p className="text-sm mt-1 max-w-sm text-center" style={{ color: "var(--text-3)" }}>
            Head to the Install tab, copy your snippet, and make your
            first test payment to see it appear here.
          </p>
          <button
            onClick={onGoToInstall}
            className="btn-apple mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
          >
            Go to Install
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: "var(--text-2)", borderColor: "var(--border)" }}>
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
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-2)" }}>
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
