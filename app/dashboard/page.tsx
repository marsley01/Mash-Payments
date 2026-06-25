"use client";

import { useEffect, useState, useCallback } from "react";

interface Config {
  id: string;
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  shortcode: string;
  environment: string;
  callback_url: string;
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

export default function DashboardPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pushResult, setPushResult] = useState("");

  const [form, setForm] = useState({
    consumer_key: "",
    consumer_secret: "",
    passkey: "",
    shortcode: "",
    environment: "sandbox",
    callback_url: "",
  });

  const [testPush, setTestPush] = useState({
    phone: "",
    amount: "",
    reference: "",
  });

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.config) {
      setConfig(data.config);
      setForm({
        consumer_key: data.config.consumer_key || "",
        consumer_secret: "",
        passkey: data.config.passkey || "",
        shortcode: data.config.shortcode || "",
        environment: data.config.environment || "sandbox",
        callback_url: data.config.callback_url || "",
      });
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch("/api/transactions");
    const data = await res.json();
    if (data.transactions) {
      setTransactions(data.transactions);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [fetchConfig, fetchTransactions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage("");

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setSaveMessage("Settings saved successfully!");
      fetchConfig();
      setTimeout(() => setSaveMessage(""), 3000);
    } else {
      setSaveMessage(data.error || "Failed to save");
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setPushResult("");

    const res = await fetch("/api/stkpush", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.NEXT_PUBLIC_API_SECRET || "",
      },
      body: JSON.stringify({
        phone: testPush.phone,
        amount: Number(testPush.amount),
        reference: testPush.reference,
      }),
    });

    const data = await res.json();
    setSending(false);

    if (data.success) {
      setPushResult(`✓ ${data.message} (ID: ${data.checkout_request_id})`);
      fetchTransactions();
    } else {
      setPushResult(`✗ ${data.message || data.error}`);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      SUCCESS: "bg-green-500/20 text-[#00C896] border-[#00C896]/30",
      FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <header className="border-b border-white/5 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "#00C896" }}>
          Mash Payments
        </h1>
        <p className="text-sm text-[#888] mt-0.5">STK Push Dashboard</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* SECTION A: Settings */}
        <section className="rounded-xl border border-white/5 p-6" style={{ background: "#141414" }}>
          <h2 className="text-lg font-semibold mb-4">Daraja Settings</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#888] mb-1">Consumer Key</label>
              <input
                type="text"
                value={form.consumer_key}
                onChange={(e) => setForm({ ...form, consumer_key: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">
                Consumer Secret {config ? "(leave blank to keep)" : ""}
              </label>
              <input
                type="password"
                value={form.consumer_secret}
                onChange={(e) => setForm({ ...form, consumer_secret: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Passkey</label>
              <input
                type="text"
                value={form.passkey}
                onChange={(e) => setForm({ ...form, passkey: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Shortcode</label>
              <input
                type="text"
                value={form.shortcode}
                onChange={(e) => setForm({ ...form, shortcode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Environment</label>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Callback URL</label>
              <input
                type="text"
                value={form.callback_url}
                onChange={(e) => setForm({ ...form, callback_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
                placeholder="https://yourdomain.com/api/callback"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "#00C896" }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {saveMessage && (
                <span className="text-sm text-[#00C896]">{saveMessage}</span>
              )}
            </div>
          </form>
        </section>

        {/* SECTION C: Test STK Push */}
        <section className="rounded-xl border border-white/5 p-6" style={{ background: "#141414" }}>
          <h2 className="text-lg font-semibold mb-4">Test STK Push</h2>
          <form onSubmit={handleSendPush} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#888] mb-1">Phone</label>
              <input
                type="text"
                value={testPush.phone}
                onChange={(e) => setTestPush({ ...testPush, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
                placeholder="0712345678"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Amount (KES)</label>
              <input
                type="number"
                value={testPush.amount}
                onChange={(e) => setTestPush({ ...testPush, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
                placeholder="500"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Reference</label>
              <input
                type="text"
                value={testPush.reference}
                onChange={(e) => setTestPush({ ...testPush, reference: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm outline-none transition focus:border-[#00C896]"
                style={{ background: "#1E1E1E", color: "#ededed" }}
                placeholder="Order-123"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-4">
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "#00C896" }}
              >
                {sending ? "Sending..." : "Send Test Push"}
              </button>
              {pushResult && (
                <span className={`text-sm ${pushResult.startsWith("✓") ? "text-[#00C896]" : "text-red-400"}`}>
                  {pushResult}
                </span>
              )}
            </div>
          </form>
        </section>

        {/* SECTION B: Transactions */}
        <section className="rounded-xl border border-white/5 p-6" style={{ background: "#141414" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Transaction Log</h2>
            <span className="text-xs text-[#888]">Auto-refreshes every 30s</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[#888]">
                  <th className="text-left py-2 pr-4 font-medium">Time</th>
                  <th className="text-left py-2 pr-4 font-medium">Phone</th>
                  <th className="text-right py-2 pr-4 font-medium">Amount (KES)</th>
                  <th className="text-left py-2 pr-4 font-medium">Reference</th>
                  <th className="text-left py-2 pr-4 font-medium">Receipt</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#888]">
                      No transactions yet
                    </td>
                  </tr>
                )}
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">{tx.phone}</td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">{tx.reference || "—"}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{tx.mpesa_receipt || "—"}</td>
                    <td className="py-3">{statusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
