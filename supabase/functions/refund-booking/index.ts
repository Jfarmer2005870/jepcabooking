import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { booking_id, amount, reason } = body as {
      booking_id?: string;
      amount?: number; // in dollars; if omitted = remaining balance
      reason?: string;
    };
    if (!booking_id) throw new Error("booking_id required");

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("*, business_profiles!inner(user_id)")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found");

    // Only the business owner can issue a refund
    if (booking.business_profiles.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only the service provider can issue a refund" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.payment_intent_id) {
      throw new Error("No payment was captured for this booking");
    }

    const totalPaid = Number(booking.total_price || 0);
    const alreadyRefunded = Number(booking.refunded_amount || 0);
    const maxRefundable = Math.max(0, totalPaid - alreadyRefunded);
    if (maxRefundable <= 0) throw new Error("Booking is already fully refunded");

    const refundDollars = amount && amount > 0 ? Math.min(amount, maxRefundable) : maxRefundable;
    const refundCents = Math.round(refundDollars * 100);

    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      amount: refundCents,
      reason: "requested_by_customer",
      metadata: { booking_id, dispute_reason: reason || "" },
    });

    const newRefunded = alreadyRefunded + refundDollars;
    const fullyRefunded = newRefunded >= totalPaid - 0.001;

    await admin
      .from("bookings")
      .update({
        refunded_amount: newRefunded,
        dispute_status: "refunded",
        dispute_resolved_at: new Date().toISOString(),
        ...(fullyRefunded ? { status: "cancelled" } : {}),
      })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({ success: true, refund_id: refund.id, refunded: refundDollars, total_refunded: newRefunded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
