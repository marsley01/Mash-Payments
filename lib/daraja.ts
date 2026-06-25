const SANDBOX_OAUTH = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const PRODUCTION_OAUTH = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const SANDBOX_STK = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const PRODUCTION_STK = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

export async function getOAuthToken(
  consumerKey: string,
  consumerSecret: string,
  env: string
): Promise<string> {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const url = env === "production" ? PRODUCTION_OAUTH : SANDBOX_OAUTH;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description || "Failed to get OAuth token");
  }
  return data.access_token as string;
}

function formatTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}${M}${d}${h}${m}${s}`;
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("+254")) p = "254" + p.slice(4);
  else if (p.startsWith("0")) p = "254" + p.slice(1);
  else if (!p.startsWith("254")) p = "254" + p;
  return p;
}

export interface DarajaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
  env: string;
}

export async function sendSTKPush(
  config: DarajaConfig,
  phone: string,
  amount: number,
  reference: string
) {
  const token = await getOAuthToken(config.consumerKey, config.consumerSecret, config.env);
  const timestamp = formatTimestamp();
  const password = Buffer.from(
    `${config.shortcode}${config.passkey}${timestamp}`
  ).toString("base64");
  const normalizedPhone = normalizePhone(phone);
  const url = config.env === "production" ? PRODUCTION_STK : SANDBOX_STK;

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.floor(amount),
    PartyA: normalizedPhone,
    PartyB: config.shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: config.callbackUrl,
    AccountReference: reference,
    TransactionDesc: reference,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}
