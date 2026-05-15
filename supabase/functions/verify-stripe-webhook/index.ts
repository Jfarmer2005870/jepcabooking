// Health-check endpoint for the Stripe webhook pipeline.
// Returns: signal that events are arriving, signature verification rate,
// recent event log, processing failures, and bookings stuck in "pending" payment.
//
// Auth: callers must send `x-verify-token: <WEBHOOK_VERIFY_TOKEN>` matching the
// secret configured in Lovable Cloud. No public access.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-verify-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const expected = Deno.env.get("WEBHOOK_VERIFY_TOKEN");
  const provided = req.headers.get("x-verify-token");
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const url = new URL(req.url);
  const hours = Math.min(168, Math.max(1, Number(url.searchParams.get("hours") ?? 24)));
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const { data: recent, error: recentErr } = await admin
    .from("stripe_webhook_events")
    .select("event_id, event_type, signature_verified, processing_status, related_booking_id, payment_intent_id, error_message, received_at, processed_at")
    .gte("received_at", since)
    .order("received_at", { ascending: false })
    .limit(50);

  if (recentErr) {
    return new Response(JSON.stringify({ error: recentErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const events = recent ?? [];
  const total = events.length;
  const verified = events.filter((e) => e.signature_verified).length;
  const failures = events.filter((e) =>
    ["signature_failed", "handler_error"].includes(e.processing_status)
  );
  const noMatch = events.filter((e) => e.processing_status === "no_matching_booking");
  const byType: Record<string, number> = {};
  for (const e of events) byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;

  // Bookings with a payment_intent_id but still showing pending/null payment_status
  const { data: stuck } = await admin
    .from("bookings")
    .select("id, payment_intent_id, payment_status, total_price, created_at")
    .not("payment_intent_id", "is", null)
    .or("payment_status.is.null,payment_status.eq.pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  // Webhook secret presence + format check
  const wh = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = {
    configured: wh.length > 0,
    format_valid: wh.startsWith("whsec_"),
    length: wh.length,
  };
  const stripeMode = stripeSecret.startsWith("sk_live_")
    ? "live"
    : stripeSecret.startsWith("sk_test_")
      ? "test"
      : "unknown";

  // Healthy checks
  const lastEvent = events[0];
  const minutesSinceLast = lastEvent
    ? Math.round((Date.now() - new Date(lastEvent.received_at).getTime()) / 60000)
    : null;

  const healthy =
    webhookSecret.configured &&
    webhookSecret.format_valid &&
    failures.length === 0 &&
    (stuck?.length ?? 0) === 0 &&
    (total === 0 || verified === total);


  return new Response(JSON.stringify({
    window_hours: hours,
    healthy,
    summary: {
      total_events: total,
      signature_verified: verified,
      signature_failed: total - verified,
      handler_failures: failures.length,
      no_matching_booking: noMatch.length,
      events_by_type: byType,
      minutes_since_last_event: minutesSinceLast,
      stuck_pending_bookings: stuck?.length ?? 0,
    },
    failures,
    stuck_bookings: stuck ?? [],
    recent_events: events,
  }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
