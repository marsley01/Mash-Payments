import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing ${name} environment variable. Check your .env.local file.`
    );
  }
  return val;
}

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  adminClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function getBrowserSupabase() {
  // NEXT_PUBLIC_ vars MUST be accessed as literal strings for Next.js
  // to inline them at build time. Dynamic access (process.env[name])
  // returns undefined on the client side.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

