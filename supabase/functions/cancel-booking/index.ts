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

    const { booking_id } = await req.json();
    if (!booking_id) throw new Error("booking_id required");

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("*, business_profiles!inner(cancellation_window_hours, cancellation_fee_pct)")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found");
    if (booking.consumer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (["cancelled", "completed"].includes(booking.status)) {
      throw new Error(`Booking is already ${booking.status}`);
    }

    const totalPaid = Number(booking.total_price || 0);
    const alreadyRefunded = Number(booking.refunded_amount || 0);
    const windowHours = Number(booking.business_profiles.cancellation_window_hours ?? 24);
    const feePct = Number(booking.business_profiles.cancellation_fee_pct ?? 50);

    // Determine refund amount
    let refundDollars = 0;
    let withinWindow = false;
    if (booking.status === "pending") {
      // Provider hasn't accepted; full refund
      refundDollars = Math.max(0, totalPaid - alreadyRefunded);
    } else {
      // Compare to scheduled time
      const dt = booking.scheduled_date && booking.scheduled_time
        ? new Date(`${booking.scheduled_date}T${booking.scheduled_time}`)
        : null;
      const hoursUntil = dt ? (dt.getTime() - Date.now()) / 3_600_000 : Infinity;
      if (hoursUntil >= windowHours) {
        refundDollars = Math.max(0, totalPaid - alreadyRefunded); // full refund
      } else {
        withinWindow = true;
        const refundPct = (100 - feePct) / 100;
        const target = totalPaid * refundPct;
        refundDollars = Math.max(0, target - alreadyRefunded);
      }
    }

    let refundId: string | null = null;
    if (refundDollars > 0 && booking.payment_intent_id) {
      const refund = await stripe.refunds.create({
        payment_intent: booking.payment_intent_id,
        amount: Math.round(refundDollars * 100),
        reason: "requested_by_customer",
        metadata: { booking_id, source: "consumer_cancel" },
      });
      refundId = refund.id;
    }

    const newRefunded = alreadyRefunded + refundDollars;
    await admin
      .from("bookings")
      .update({
        status: "cancelled",
        refunded_amount: newRefunded,
      })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        refunded: refundDollars,
        within_window: withinWindow,
        fee_pct: withinWindow ? feePct : 0,
        refund_id: refundId,
      }),
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
