import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cron-invoked: cancels pending bookings past their auto_cancel_at deadline.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only endpoint: require the shared verify token.
  const expected = Deno.env.get("WEBHOOK_VERIFY_TOKEN");
  const provided = req.headers.get("x-verify-token");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: expired, error } = await admin
      .from("bookings")
      .select("id, payment_intent_id, consumer_id, services(title)")
      .eq("status", "pending")
      .lte("auto_cancel_at", new Date().toISOString());

    if (error) throw error;

    let cancelled = 0;
    for (const b of expired || []) {
      if (b.payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(b.payment_intent_id);
        } catch (e) {
          console.error("Stripe cancel failed", b.id, e);
        }
      }
      await admin.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
      await admin.from("notifications").insert({
        user_id: b.consumer_id,
        type: "booking_auto_cancelled",
        title: "Booking auto-cancelled",
        message: `Your booking for "${(b as any).services?.title || "the service"}" was automatically cancelled because the provider didn't respond in 24 hours. No charge was made.`,
        related_id: b.id,
      });
      cancelled++;
    }

    return new Response(JSON.stringify({ cancelled }), {
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
