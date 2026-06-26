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
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(supabaseUrl, supabaseKey);
}
