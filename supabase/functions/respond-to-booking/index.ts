import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    if (!authHeader) throw new Error("Not authenticated");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { booking_id, action } = await req.json();
    if (!booking_id || !["accept", "decline"].includes(action)) {
      throw new Error("booking_id and action ('accept' | 'decline') are required");
    }

    // Verify business owns this booking
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("*, business_profiles!inner(user_id, business_name), services(title), profiles:consumer_id(email)")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found");
    if (booking.business_profiles.user_id !== user.id) {
      throw new Error("Not authorized for this booking");
    }
    if (booking.status !== "pending") {
      throw new Error(`Booking is already ${booking.status}`);
    }

    // Try to fetch the latest payment intent from the checkout session if not stored
    let paymentIntentId: string | null = booking.payment_intent_id;
    if (!paymentIntentId) {
      // Find session by metadata
      const sessions = await stripe.checkout.sessions.list({ limit: 20 });
      const match = sessions.data.find((s) => s.metadata?.booking_id === booking_id);
      if (match?.payment_intent) {
        paymentIntentId = match.payment_intent as string;
        await admin.from("bookings").update({ payment_intent_id: paymentIntentId }).eq("id", booking_id);
      }
    }

    if (action === "accept") {
      if (paymentIntentId) {
        try {
          await stripe.paymentIntents.capture(paymentIntentId);
        } catch (e) {
          // If already captured or no auth, continue but log
          console.error("Capture error:", e);
        }
      }
      await admin.from("bookings").update({ status: "confirmed" }).eq("id", booking_id);

      await admin.from("notifications").insert({
        user_id: booking.consumer_id,
        type: "booking_accepted",
        title: "Booking accepted",
        message: `Your booking for "${booking.services?.title || "the service"}" has been accepted.`,
        related_id: booking_id,
      });
    } else {
      // decline
      if (paymentIntentId) {
        try {
          await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (e) {
          console.error("Cancel error:", e);
        }
      }
      await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking_id);

      await admin.from("notifications").insert({
        user_id: booking.consumer_id,
        type: "booking_declined",
        title: "Booking declined",
        message: `Your booking for "${booking.services?.title || "the service"}" was declined. No charge was made.`,
        related_id: booking_id,
      });
    }

    // Send transactional email to consumer (fire and forget)
    const consumerEmail = (booking as any).profiles?.email;
    if (consumerEmail) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: action === "accept" ? "booking-accepted" : "booking-declined",
            recipientEmail: consumerEmail,
            idempotencyKey: `${action === "accept" ? "accepted" : "declined"}-${booking_id}`,
            templateData: {
              serviceName: booking.services?.title,
              businessName: booking.business_profiles?.business_name,
              scheduledDate: booking.scheduled_date,
              scheduledTime: booking.scheduled_time,
              serviceAddress: booking.service_address,
            },
          },
        });
      } catch (e) {
        console.error("Failed to enqueue booking response email:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, status: action === "accept" ? "confirmed" : "cancelled" }), {
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
