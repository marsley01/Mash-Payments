import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  if (error) {
    console.error("keep-alive error:", error.message)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  console.log("keep-alive ok — profiles count:", count)
  return new Response(JSON.stringify({ ok: true, count }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
