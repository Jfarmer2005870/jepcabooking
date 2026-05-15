// One-off admin helper to provision a confirmed consumer test account.
// Gated by the WEBHOOK_VERIFY_TOKEN so it isn't open to the world.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-verify-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("x-verify-token");
  if (!token || token !== Deno.env.get("WEBHOOK_VERIFY_TOKEN")) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, full_name } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "email and password required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Create or look up user (idempotent for re-runs)
  let userId: string | null = null;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? "Test Consumer" },
  });

  if (createErr) {
    if (!/already (registered|exists)/i.test(createErr.message)) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Fetch existing
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) {
      return new Response(JSON.stringify({ error: "user exists but could not be found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = existing.id;
    // Reset password so creds always work
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    userId = created.user!.id;
  }

  // Ensure consumer role
  await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "consumer" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ ok: true, user_id: userId, email }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
