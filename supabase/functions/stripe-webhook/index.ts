import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      // Fallback for testing without signature verification configured
      event = JSON.parse(body) as Stripe.Event;
      console.warn("Webhook signature not verified — STRIPE_WEBHOOK_SECRET not set");
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("Stripe webhook event:", event.type);

    const findBookingByPI = async (paymentIntentId: string) => {
      const { data } = await admin
        .from("bookings")
        .select("id, consumer_id, business_id, services(title), profiles:consumer_id(email)")
        .eq("payment_intent_id", paymentIntentId)
        .maybeSingle();
      return data;
    };

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const booking = await findBookingByPI(pi.id);
        if (booking) {
          await admin
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", booking.id);
        }
        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const booking = await findBookingByPI(pi.id);
        if (booking) {
          await admin
            .from("bookings")
            .update({ payment_status: event.type === "payment_intent.canceled" ? "canceled" : "failed" })
            .eq("id", booking.id);
          await admin.from("notifications").insert({
            user_id: booking.consumer_id,
            type: "payment_failed",
            title: "Payment issue",
            message: `There was a problem with the payment for "${(booking as any).services?.title || "your booking"}".`,
            related_id: booking.id,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (!piId) break;
        const booking = await findBookingByPI(piId);
        if (booking) {
          const refundedAmount = (charge.amount_refunded || 0) / 100;
          await admin
            .from("bookings")
            .update({
              refunded_amount: refundedAmount,
              payment_status: charge.refunded ? "refunded" : "partially_refunded",
            })
            .eq("id", booking.id);
          await admin.from("notifications").insert({
            user_id: booking.consumer_id,
            type: "refund_issued",
            title: "Refund issued",
            message: `A refund of $${refundedAmount.toFixed(2)} has been issued for "${(booking as any).services?.title || "your booking"}".`,
            related_id: booking.id,
          });

          // Email the consumer
          const consumerEmail = (booking as any).profiles?.email;
          if (consumerEmail) {
            try {
              await admin.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "refund-issued",
                  recipientEmail: consumerEmail,
                  idempotencyKey: `refund-${booking.id}-${charge.id}`,
                  templateData: {
                    serviceName: (booking as any).services?.title,
                    refundAmount: refundedAmount.toFixed(2),
                    fullRefund: !!charge.refunded,
                  },
                },
              });
            } catch (e) {
              console.error("Failed to enqueue refund email:", e);
            }
          }
        }
        break;
      }

      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
        if (!piId) break;
        const booking = await findBookingByPI(piId);
        if (booking) {
          await admin
            .from("bookings")
            .update({ dispute_status: dispute.status })
            .eq("id", booking.id);

          // Notify the business owner
          const { data: bp } = await admin
            .from("business_profiles")
            .select("user_id")
            .eq("id", booking.business_id)
            .maybeSingle();
          if (bp?.user_id && event.type === "charge.dispute.created") {
            await admin.from("notifications").insert({
              user_id: bp.user_id,
              type: "dispute_created",
              title: "Payment dispute opened",
              message: `A customer disputed the charge for "${(booking as any).services?.title || "a booking"}". Check your Stripe dashboard.`,
              related_id: booking.id,
            });
          }
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook handler error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
