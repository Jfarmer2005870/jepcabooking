import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // User client for auth validation
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    const userEmail = userData?.user?.email;

    if (userError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Admin client for DB mutations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get business profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("business_profiles")
      .select("id, stripe_account_id, business_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) throw new Error("Business profile not found");

    const body = await req.json();
    const { action } = body;

    if (action === "status") {
      // Check if they have a connected account and its status
      if (!profile.stripe_account_id) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      return new Response(JSON.stringify({
        connected: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or retrieve connected account
    let accountId = profile.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        business_type: "individual",
        email: userEmail,
        business_profile: {
          name: profile.business_name,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Save to database
      await supabaseClient
        .from("business_profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", profile.id);
    }

    // Validate return_url against an allowlist of trusted app origins to
    // prevent open-redirect abuse via the Stripe onboarding flow.
    const ALLOWED_ORIGINS = [
      "https://jepcabooking.lovable.app",
      "https://id-preview--d3c284da-d79e-41f4-8e4b-df82217ff9b3.lovable.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8080",
    ];
    const candidate =
      (typeof body.return_url === "string" && body.return_url) ||
      req.headers.get("origin") ||
      ALLOWED_ORIGINS[0];
    let baseUrl = ALLOWED_ORIGINS[0];
    try {
      const u = new URL(candidate);
      const candOrigin = `${u.protocol}//${u.host}`;
      if (ALLOWED_ORIGINS.includes(candOrigin)) baseUrl = candOrigin;
    } catch {
      // fall back to default
    }
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard`,
      return_url: `${baseUrl}/dashboard?stripe_connected=true`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
