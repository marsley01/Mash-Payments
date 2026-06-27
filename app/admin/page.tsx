"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTheme } from "@/lib/theme-context";

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
              {activeTab === "overview" && <OverviewTab stats={stats} />}
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

function OverviewTab({ stats }: { stats: AdminStats | null }) {
  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: "ti-users", color: "#3B82F6" },
    { label: "Total Transactions", value: stats?.totalTransactions ?? 0, icon: "ti-file-invoice", color: "#8B5CF6" },
    { label: "Total Revenue", value: stats ? formatKES(stats.totalRevenue) : "KES 0", icon: "ti-currency-dollar", color: "#00C896" },
    { label: "Active Gateways", value: stats?.activeGateways ?? 0, icon: "ti-shield-check", color: "#F59E0B" },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-6" style={{ color: "var(--text-1)" }}>Admin Overview</h2>
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
