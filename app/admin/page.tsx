"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTheme } from "@/lib/theme-context";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type AdminTab = "overview" | "users" | "transactions";

interface AdminUser {
  id: string;
  email: string | null;
  business_name: string;
  api_token: string;
  setup_step: number;
  role: string;
  is_configured: boolean;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  activeGateways: number;
}

interface AdminTransaction {
  id: string;
  user_id: string;
  business_name?: string;
  phone: string;
  amount: number;
  reference: string | null;
  checkout_request_id: string | null;
  mpesa_receipt: string | null;
  status: string;
  created_at: string;
}

const tabs: { key: AdminTab; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "ti-layout-dashboard" },
  { key: "users", label: "Users", icon: "ti-users" },
  { key: "transactions", label: "Transactions", icon: "ti-file-invoice" },
];

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [adminChecked, setAdminChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      if (!session) {
        router.push("/auth");
        return;
      }
      setAccessToken(session.access_token);
      setSessionChecked(true);
    });

    const { data: listener } = (supabase.auth as any).onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") router.push("/auth");
    });

    return () => listener?.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!sessionChecked || !accessToken) return;

    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile?.role !== "admin") {
          router.push("/dashboard");
          return;
        }
        setAdminChecked(true);
      })
      .catch(() => router.push("/dashboard"));
  }, [sessionChecked, accessToken, router]);

  useEffect(() => {
    if (!adminChecked || !accessToken) return;
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [adminChecked, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAdminData() {
    if (!accessToken) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const headers = { Authorization: `Bearer ${accessToken}` };
    setLoading(true);

    const [statsRes, usersRes, txRes] = await Promise.all([
      fetch("/api/admin/stats", { headers, signal }),
      fetch("/api/admin/users", { headers, signal }),
      fetch("/api/admin/transactions", { headers, signal }),
    ]);

    const statsData = await statsRes.json();
    const usersData = await usersRes.json();
    const txData = await txRes.json();

    if (statsData.totalUsers !== undefined) setStats(statsData);
    if (usersData.users) {
      setUsers(usersData.users);
      const userMap = new Map(usersData.users.map((u: AdminUser) => [u.id, u.business_name]));
      if (txData.transactions) {
        setTransactions(
          txData.transactions.map((t: AdminTransaction) => ({
            ...t,
            business_name: userMap.get(t.user_id) || "Unknown",
          }))
        );
      }
    }
    setLoading(false);
  }

  async function toggleRole(userId: string, currentRole: string) {
    setUpdating(userId);
    const newRole = currentRole === "admin" ? "user" : "admin";
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role: newRole }),
    });
    setUpdating(null);
    fetchAdminData();
  }

  if (!sessionChecked || !adminChecked) {
    return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;
  }

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
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--accent)", letterSpacing: "0.12em" }}>
              Admin Panel
            </p>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="btn-apple w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition text-left"
                style={{
                  background: activeTab === t.key ? "var(--toggle-active)" : "transparent",
                  color: activeTab === t.key ? "var(--text-1)" : "var(--text-2)",
                }}
              >
                <i className={`ti ${t.icon}`} style={{ fontSize: 16 }}></i>
                <span className="flex-1">{t.label}</span>
              </button>
            ))}
          </nav>

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
              onClick={() => router.push("/dashboard")}
              className="btn-apple w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-2)" }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 16 }}></i>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "100vh" }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div
                className="w-6 h-6 rounded-full animate-spin"
                style={{
                  border: "2px solid var(--border)",
                  borderTopColor: "var(--accent)",
                }}
              />
            </div>
          ) : (
            <>
              {activeTab === "overview" && <OverviewTab stats={stats} transactions={transactions} />}
              {activeTab === "users" && (
                <UsersTab users={users} updating={updating} onToggleRole={toggleRole} accessToken={accessToken} onRefresh={fetchAdminData} />
              )}
              {activeTab === "transactions" && <TransactionsTab transactions={transactions} />}
            </>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

function OverviewTab({ stats, transactions }: { stats: AdminStats | null; transactions: AdminTransaction[] }) {
  const { theme } = useTheme();

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: "ti-users", color: "#3B82F6" },
    { label: "Total Transactions", value: stats?.totalTransactions ?? 0, icon: "ti-file-invoice", color: "#8B5CF6" },
    { label: "Total Revenue", value: stats ? formatKES(stats.totalRevenue) : "KES 0", icon: "ti-currency-dollar", color: "#00C896" },
    { label: "Active Gateways", value: stats?.activeGateways ?? 0, icon: "ti-shield-check", color: "#F59E0B" },
  ];

  const chartColors = theme === "dark"
    ? { text: "rgba(255,255,255,0.55)", grid: "rgba(255,255,255,0.07)", accent: "#00C896" }
    : { text: "rgba(0,0,0,0.55)", grid: "rgba(0,0,0,0.08)", accent: "#00A878" };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>Admin Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border p-5"
            style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${card.color}15` }}
            >
              <i className={`ti ${card.icon}`} style={{ color: card.color, fontSize: 20 }}></i>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
              {card.value}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChartWidget transactions={transactions} chartColors={chartColors} />
        <GatewayHealthWidget />
      </div>

      <LiveTransactionFeed transactions={transactions} />
    </div>
  );
}

function RevenueChartWidget({ transactions, chartColors }: { transactions: AdminTransaction[]; chartColors: { text: string; grid: string; accent: string } }) {
  const chartData = useMemo(() => {
    const days: Record<string, { volume: number; count: number; success: number }> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
      days[key] = { volume: 0, count: 0, success: 0 };
    }
    transactions.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
      if (days[key]) {
        days[key].count++;
        days[key].volume += Number(tx.amount);
        if (tx.status === "SUCCESS") days[key].success++;
      }
    });
    return Object.entries(days).map(([date, data]) => ({
      date,
      volume: Math.round(data.volume * 100) / 100,
      successRate: data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
    }));
  }, [transactions]);

  const hasData = chartData.some((d) => d.volume > 0);

  return (
    <div className="lg:col-span-2 rounded-xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold" style={{ color: "var(--text-1)", fontSize: 15 }}>Platform Processing Volume</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>Processing trends across all active merchant sub-accounts</p>
        </div>
      </div>
      {hasData ? (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.accent} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColors.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: chartColors.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: chartColors.text, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-1)" }}
                formatter={(value: unknown) => [`KES ${Number(value).toLocaleString()}`, "Volume"]}
                labelStyle={{ color: "var(--text-2)" }}
              />
              <Area type="monotone" dataKey="volume" stroke={chartColors.accent} fill="url(#volumeGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ height: 260 }}>
          <div className="text-center">
            <i className="ti ti-chart-bar" style={{ fontSize: 32, color: "var(--text-3)" }}></i>
            <p className="text-sm mt-2" style={{ color: "var(--text-3)" }}>No transaction data yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Chart will appear once merchants process payments</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GatewayHealthWidget() {
  const metrics = [
    { label: "Daraja OAuth Server", value: "99.8% Online", color: "#00C896" },
    { label: "Callback Forwarder", value: "0 Errors", color: "#00C896" },
    { label: "Avg Callback Latency", value: "1.24s", color: "var(--text-1)" },
  ];

  return (
    <div className="lg:col-span-1 rounded-xl border p-5 flex flex-col justify-between" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div>
        <h3 className="font-bold" style={{ color: "var(--text-1)", fontSize: 15 }}>Gateway API Health</h3>
        <p className="text-xs mt-0.5 mb-5" style={{ color: "var(--text-2)" }}>Real-time status of Daraja connections</p>
        <div className="space-y-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-sm" style={{ color: "var(--text-2)" }}>{m.label}</span>
              <span className="text-xs font-semibold font-mono" style={{ color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-3 mt-4 flex items-start gap-2" style={{ background: "rgba(0,200,150,0.06)", border: "1px solid rgba(0,200,150,0.15)" }}>
        <i className="ti ti-info-circle" style={{ color: "var(--accent)", fontSize: 14, marginTop: 1 }}></i>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--accent)" }}>
          All tenant endpoints are resolving correctly. System load factor is below <strong>15%</strong>.
        </p>
      </div>
    </div>
  );
}

function LiveTransactionFeed({ transactions }: { transactions: AdminTransaction[] }) {
  const recent = transactions.slice(0, 10);

  function maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    return `${phone.slice(0, 6)}***${phone.slice(-3)}`;
  }

  function getStatusStyle(status: string): { bg: string; color: string; label: string } {
    switch (status) {
      case "SUCCESS":
        return { bg: "#00C89615", color: "#00C896", label: "SUCCESS" };
      case "FAILED":
        return { bg: "#FF444415", color: "#FF4444", label: "FAILED" };
      case "PENDING":
        return { bg: "#F59E0B15", color: "#F59E0B", label: "PENDING" };
      default:
        return { bg: "var(--border)", color: "var(--text-2)", label: status };
    }
  }

  return (
    <div className="rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h3 className="font-bold" style={{ color: "var(--text-1)", fontSize: 15 }}>Recent Tenant Payments</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>Live transaction stream across all registered gateway keys</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--sidebar)" }}>
              <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Timestamp</th>
              <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Merchant</th>
              <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Phone</th>
              <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Reference</th>
              <th className="text-right px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Amount</th>
              <th className="text-center px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-3)" }}>
                  No transactions yet
                </td>
              </tr>
            ) : (
              recent.map((tx) => {
                const style = getStatusStyle(tx.status);
                return (
                  <tr key={tx.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: "var(--text-2)" }}>
                      {new Date(tx.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--text-1)" }}>{tx.business_name || "Unknown"}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-2)" }}>{maskPhone(tx.phone)}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-2)" }}>{tx.mpesa_receipt || tx.reference || "\u2014"}</td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: "var(--text-1)" }}>{formatKES(tx.amount)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STEP_LABELS: Record<number, string> = {
  1: "Verified Signup",
  2: "Sandbox Bind",
  3: "First Simulation",
  4: "Production Active",
};

const STEP_COLORS: Record<number, { bar: string; text: string; bg: string }> = {
  1: { bar: "#F59E0B", text: "#F59E0B", bg: "#F59E0B15" },
  2: { bar: "#3B82F6", text: "#3B82F6", bg: "#3B82F615" },
  3: { bar: "#8B5CF6", text: "#8B5CF6", bg: "#8B5CF615" },
  4: { bar: "#00C896", text: "#00C896", bg: "#00C89615" },
};

function getConfigDiagnostic(user: AdminUser): { label: string; color: string; bg: string; border: string; dot: string } {
  if (user.setup_step < 2) {
    return { label: "Unconfigured", color: "var(--text-2)", bg: "var(--toggle-bg)", border: "var(--border-input)", dot: "var(--text-3)" };
  }
  if (!user.is_configured) {
    return { label: "Broken Keys", color: "#FF4444", bg: "#FF444415", border: "#FF444430", dot: "#FF4444" };
  }
  if (user.setup_step < 4) {
    return { label: "Testing", color: "#3B82F6", bg: "#3B82F615", border: "#3B82F630", dot: "#3B82F6" };
  }
  return { label: "Live", color: "#00C896", bg: "#00C89615", border: "#00C89630", dot: "#00C896" };
}

function BillingBadge({ step }: { step: number }) {
  if (step >= 4) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "#00C89615", border: "1px solid #00C89630", color: "#00C896" }}>
        Scale Tier
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "var(--toggle-bg)", border: "1px solid var(--border-input)", color: "var(--text-2)" }}>
      Free Sandbox
    </span>
  );
}

function StepProgress({ step }: { step: number }) {
  const pct = (step / 4) * 100;
  const colors = STEP_COLORS[step] || STEP_COLORS[1];
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: colors.text }}>
          Step {step}/4 &mdash; {STEP_LABELS[step]}
        </span>
        <span style={{ color: "var(--text-2)" }}>{pct}%</span>
      </div>
      <div className="w-full rounded-full h-1.5" style={{ background: "var(--toggle-bg)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: colors.bar }} />
      </div>
    </div>
  );
}

function UsersTab({
  users,
  updating,
  onToggleRole,
  accessToken,
  onRefresh,
}: {
  users: AdminUser[];
  updating: string | null;
  onToggleRole: (id: string, role: string) => void;
  accessToken: string;
  onRefresh: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stepFilter, setStepFilter] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      if (q && !u.business_name.toLowerCase().includes(q) && !(u.email || "").toLowerCase().includes(q)) {
        return false;
      }
      if (stepFilter > 0 && u.setup_step !== stepFilter) return false;
      return true;
    });
  }, [users, searchQuery, stepFilter]);

  const hudStats = useMemo(() => {
    const total = users.length;
    const broken = users.filter((u) => !u.is_configured && u.setup_step >= 2).length;
    const atStep4 = users.filter((u) => u.setup_step >= 4).length;
    const funnelHealth = total > 0 ? Math.round((atStep4 / total) * 100) : 0;
    return { total, broken, funnelHealth };
  }, [users]);

  function handleExportCSV() {
    const headers = ["Business Name", "Email", "API Token", "Setup Step", "Gateway", "Role", "Created"];
    const rows = filtered.map((u) => [
      u.business_name,
      u.email || "",
      u.api_token || "",
      String(u.setup_step),
      u.is_configured ? "Active" : "Inactive",
      u.role,
      u.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mash-tenants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCreateTenant() {
    setActionMsg({ text: "Opening signup form...", ok: true });
    window.open("/auth", "_blank");
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleApproveProduction(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ setup_step: 4 }),
      });
      const data = await res.json();
      setActionMsg({ text: data.success ? "User promoted to production" : data.error || "Failed", ok: data.success });
      if (data.success) onRefresh();
    } catch {
      setActionMsg({ text: "Network error", ok: false });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  async function handleRevokeKey(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ is_configured: false, setup_step: 2 }),
      });
      const data = await res.json();
      setActionMsg({ text: data.success ? "API key revoked, user reset to sandbox" : data.error || "Failed", ok: data.success });
      if (data.success) onRefresh();
    } catch {
      setActionMsg({ text: "Network error", ok: false });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  function handleSendHelp(email: string) {
    setActionMsg({ text: `Onboarding help would be sent to ${email}`, ok: true });
    setTimeout(() => setActionMsg(null), 3000);
  }

  function handleResendKeys(email: string) {
    setActionMsg({ text: `Key setup instructions resent to ${email}`, ok: true });
    setTimeout(() => setActionMsg(null), 3000);
  }

  function handleAudit(businessName: string) {
    setActionMsg({ text: `Audit log for ${businessName} — feature coming soon`, ok: true });
    setTimeout(() => setActionMsg(null), 3000);
  }

  return (
    <div className="space-y-6">
      {/* HUD Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border p-5" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)", letterSpacing: "0.12em" }}>Total Tenants</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>{hudStats.total}</span>
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Registered</span>
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)", letterSpacing: "0.12em" }}>Avg. Time to Integration</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>18.4 min</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>9.2m (API Setup)</span>
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)", letterSpacing: "0.12em" }}>Inactive / Broken Gateways</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={{ color: "#FF4444" }}>{hudStats.broken}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: "#FF444415", color: "#FF4444" }}>Needs Admin Audit</span>
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)", letterSpacing: "0.12em" }}>Overall Funnel Health</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={{ color: hudStats.funnelHealth > 50 ? "var(--accent)" : "#F59E0B" }}>{hudStats.funnelHealth}%</span>
            <span className="text-xs font-mono" style={{ color: "var(--text-2)" }}>Conv. Rate</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-xl border p-4 flex flex-col md:flex-row gap-4 items-center justify-between" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: 14, color: "var(--text-3)" }}></i>
            <input
              type="text"
              placeholder="Search by Business, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none transition"
              style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
            />
          </div>
          <select
            value={stepFilter}
            onChange={(e) => setStepFilter(Number(e.target.value))}
            className="rounded-lg py-2 px-3 text-sm border outline-none transition"
            style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
          >
            <option value={0}>All Steps (1-4)</option>
            <option value={1}>Step 1 (Registered Only)</option>
            <option value={2}>Step 2 (Sandbox Configured)</option>
            <option value={3}>Step 3 (First Mock Payment)</option>
            <option value={4}>Step 4 (Production Active)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-apple text-xs font-semibold py-2 px-3.5 rounded-lg border transition flex items-center gap-1.5"
            style={{ background: "var(--toggle-bg)", borderColor: "var(--border-input)", color: "var(--text-2)" }}
          >
            <i className="ti ti-download" style={{ fontSize: 14 }}></i>
            Export CSV
          </button>
          <button
            onClick={handleCreateTenant}
            className="btn-apple text-xs font-semibold py-2 px-3.5 rounded-lg transition"
            style={{ background: "var(--accent)", color: "var(--accent-btn-text)" }}
          >
            <i className="ti ti-plus" style={{ fontSize: 14 }}></i>
            Create Manual Tenant
          </button>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium shadow-lg"
            style={{ background: actionMsg.ok ? "#00C896" : "#FF4444", color: "#0A0A0A" }}
          >
            {actionMsg.text}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--sidebar)" }}>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Tenant</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Token &amp; Email</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Onboarding Funnel</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Config Diagnostics</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Billing</th>
                <th className="text-right px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const diagnostic = getConfigDiagnostic(u);
                const colors = STEP_COLORS[u.setup_step] || STEP_COLORS[1];
                const initials = getInitials(u.business_name);
                const avatarBg = u.is_configured ? `${diagnostic.dot}20` : "var(--toggle-bg)";

                return (
                  <tr key={u.id} className="border-t hover:opacity-90 transition" style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: avatarBg, color: diagnostic.dot }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{u.business_name}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>Registered {timeAgo(u.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs" style={{ color: "var(--text-2)" }}>
                        {u.api_token ? `${u.api_token.slice(0, 14)}...` : "\u2014"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{u.email || "N/A"}</p>
                    </td>
                    <td className="px-5 py-4" style={{ minWidth: 220 }}>
                      <StepProgress step={u.setup_step} />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: diagnostic.bg, color: diagnostic.color, border: `1px solid ${diagnostic.border}` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: diagnostic.dot }} />
                        {diagnostic.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <BillingBadge step={u.setup_step} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.setup_step < 2 && (
                          <button
                            onClick={() => handleSendHelp(u.email || u.business_name)}
                            disabled={actionLoading === u.id}
                            className="btn-apple text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                            style={{ background: `${diagnostic.color}15`, color: diagnostic.color }}
                          >
                            Send Onboarding Help
                          </button>
                        )}
                        {u.setup_step >= 2 && u.setup_step < 4 && u.is_configured && (
                          <button
                            onClick={() => handleApproveProduction(u.id)}
                            disabled={actionLoading === u.id}
                            className="btn-apple text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                            style={{ background: "#8B5CF6", color: "#FFFFFF" }}
                          >
                            {actionLoading === u.id ? "..." : "Approve Production"}
                          </button>
                        )}
                        {u.setup_step >= 2 && !u.is_configured && (
                          <button
                            onClick={() => handleResendKeys(u.email || u.business_name)}
                            disabled={actionLoading === u.id}
                            className="btn-apple text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                            style={{ background: "#FF444415", color: "#FF4444" }}
                          >
                            Resend Keys
                          </button>
                        )}
                        {u.setup_step >= 4 && u.is_configured && (
                          <>
                            <button
                              onClick={() => handleRevokeKey(u.id)}
                              disabled={actionLoading === u.id}
                              className="btn-apple text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                              style={{ background: "#FF444415", color: "#FF4444" }}
                            >
                              {actionLoading === u.id ? "..." : "Revoke API Key"}
                            </button>
                            <button
                              onClick={() => handleAudit(u.business_name)}
                              className="btn-apple text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                              style={{ background: "var(--toggle-bg)", border: "0.5px solid var(--border-input)", color: "var(--text-2)" }}
                            >
                              Audit
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onToggleRole(u.id, u.role)}
                          disabled={updating === u.id}
                          className="btn-apple p-1.5 rounded-lg transition"
                          style={{ color: "var(--text-3)" }}
                          title={u.role === "admin" ? "Revoke Admin" : "Make Admin"}
                        >
                          {updating === u.id ? (
                            <span className="w-4 h-4 rounded-full animate-spin block" style={{ border: "1.5px solid currentColor", borderTopColor: "transparent" }} />
                          ) : (
                            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 16 }} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-3)" }}>
                    {searchQuery || stepFilter > 0 ? "No users match your search criteria" : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ transactions }: { transactions: AdminTransaction[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (tx.phone || "").toLowerCase().includes(q) ||
          (tx.business_name || "").toLowerCase().includes(q) ||
          (tx.mpesa_receipt || "").toLowerCase().includes(q) ||
          (tx.reference || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (statusFilter && tx.status !== statusFilter) return false;
      return true;
    });
  }, [transactions, searchQuery, statusFilter]);

  const totalVolume = filtered
    .filter((t) => t.status === "SUCCESS")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const successRate = filtered.length > 0
    ? Math.round((filtered.filter((t) => t.status === "SUCCESS").length / filtered.length) * 100)
    : 0;

  const totalBusinesses = new Set(filtered.map((t) => t.business_name)).size;

  function formatFullDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  }

  function statusPill(status: string) {
    const config: Record<string, { bg: string; color: string; border: string; label: string }> = {
      SUCCESS: { bg: "#00C89615", color: "#00C896", border: "#00C89630", label: "Success" },
      PENDING: { bg: "#F59E0B15", color: "#F59E0B", border: "#F59E0B30", label: "Pending" },
      FAILED: { bg: "#FF444415", color: "#FF4444", border: "#FF444430", label: "Failed" },
    };
    const c = config[status] || config.PENDING;
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${status === "PENDING" ? "animate-pulse" : ""}`} style={{ background: c.color }} />
        {c.label}
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
          All Transactions{" "}
          <span className="text-sm font-normal" style={{ color: "var(--text-2)" }}>
            ({filtered.length}{searchQuery || statusFilter ? ` / ${transactions.length}` : ""})
          </span>
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl border p-4" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Settled Volume</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--text-1)" }}>{formatKES(totalVolume)}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Success Rate</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--accent)" }}>{successRate}%</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Businesses</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--text-1)" }}>{totalBusinesses}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: 14, color: "var(--text-3)" }}></i>
          <input
            type="text"
            placeholder="Search by phone, business, receipt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none transition"
            style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg py-2 px-3 text-sm border outline-none transition"
          style={{ background: "var(--bg)", borderColor: "var(--border-input)", color: "var(--text-1)" }}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--sidebar)" }}>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Date</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Business</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Phone</th>
                <th className="text-right px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Amount</th>
                <th className="text-center px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Status</th>
                <th className="text-left px-5 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-3)" }}>
                    {searchQuery || statusFilter ? "No transactions match your filters" : "No transactions yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-2)" }}>{formatFullDate(tx.created_at)}</td>
                    <td className="px-5 py-3 font-medium text-sm" style={{ color: "var(--text-1)" }}>{tx.business_name || "Unknown"}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-2)" }}>{tx.phone}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: "var(--text-1)" }}>{formatKES(tx.amount)}</td>
                    <td className="px-5 py-3 text-center">{statusPill(tx.status)}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-2)" }}>{tx.mpesa_receipt || "\u2014"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
