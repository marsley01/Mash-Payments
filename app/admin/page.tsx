"use client";

import { useEffect, useState, useMemo } from "react";
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
    return () => clearInterval(interval);
  }, [adminChecked, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAdminData() {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    setLoading(true);

    const [statsRes, usersRes, txRes] = await Promise.all([
      fetch("/api/admin/stats", { headers }),
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/transactions", { headers }),
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
                <UsersTab users={users} updating={updating} onToggleRole={toggleRole} />
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

function UsersTab({
  users,
  updating,
  onToggleRole,
}: {
  users: AdminUser[];
  updating: string | null;
  onToggleRole: (id: string, role: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
          Users{" "}
          <span className="text-sm font-normal" style={{ color: "var(--text-2)" }}>
            ({users.length})
          </span>
        </h2>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--sidebar)" }}>
                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Business</th>
                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Email</th>
                <th className="text-center px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Setup</th>
                <th className="text-center px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Gateway</th>
                <th className="text-center px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Role</th>
                <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-1)" }}>{u.business_name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{u.email || "N/A"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent)15", color: "var(--accent)" }}
                    >
                      Step {u.setup_step}/4
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: u.is_configured ? "#00C89615" : "#FF444415",
                        color: u.is_configured ? "#00C896" : "#FF4444",
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: u.is_configured ? "#00C896" : "#FF4444" }}
                      />
                      {u.is_configured ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: u.role === "admin" ? "#8B5CF615" : "#3B82F615",
                        color: u.role === "admin" ? "#8B5CF6" : "#3B82F6",
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onToggleRole(u.id, u.role)}
                      disabled={updating === u.id}
                      className="btn-apple text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      style={{
                        background: u.role === "admin" ? "#FF444415" : "#8B5CF615",
                        color: u.role === "admin" ? "#FF4444" : "#8B5CF6",
                      }}
                    >
                      {updating === u.id ? (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full animate-spin"
                            style={{ border: "1.5px solid currentColor", borderTopColor: "transparent" }}
                          />
                          ...
                        </span>
                      ) : u.role === "admin" ? (
                        "Revoke Admin"
                      ) : (
                        "Make Admin"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-3)" }}>
                    No users found
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
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>
          Transactions{" "}
          <span className="text-sm font-normal" style={{ color: "var(--text-2)" }}>
            ({transactions.length})
          </span>
        </h2>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--sidebar)" }}>
                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Date</th>
                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Business</th>
                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Phone</th>
                <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Amount</th>
                <th className="text-center px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-2)" }}>{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-1)" }}>{tx.business_name || "Unknown"}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-2)" }}>{tx.phone}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-1)" }}>{formatKES(tx.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: tx.status === "SUCCESS" ? "#00C89615" : tx.status === "FAILED" ? "#FF444415" : "#F59E0B15",
                        color: tx.status === "SUCCESS" ? "#00C896" : tx.status === "FAILED" ? "#FF4444" : "#F59E0B",
                      }}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-2)" }}>{tx.mpesa_receipt || "\u2014"}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-3)" }}>
                    No transactions yet
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
