// Monitoring scan: detects failed payments, webhook errors, booking inconsistencies
// and inserts deduped rows into public.monitoring_alerts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-verify-token",
};

type Alert = {
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  details: Record<string, unknown>;
  related_booking_id?: string | null;
  related_event_id?: string | null;
  dedupe_key: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function scanFailedPayments(): Promise<Alert[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("bookings")
    .select("id, payment_status, payment_intent_id, total_price, updated_at")
    .eq("payment_status", "failed")
    .gte("updated_at", since);
  if (error) throw error;
  return (data ?? []).map((b) => ({
    alert_type: "payment_failed",
    severity: "critical" as const,
    title: `Payment failed for booking ${b.id.slice(0, 8)}`,
    details: { payment_intent_id: b.payment_intent_id, total_price: b.total_price, updated_at: b.updated_at },
    related_booking_id: b.id,
    dedupe_key: `payment_failed:${b.id}:${b.payment_intent_id ?? "none"}`,
  }));
}

async function scanWebhookErrors(): Promise<Alert[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("stripe_webhook_events")
    .select("event_id, event_type, processing_status, signature_verified, error_message, related_booking_id, received_at")
    .gte("received_at", since)
    .or("signature_verified.eq.false,processing_status.eq.error,processing_status.eq.signature_failed");
  if (error) throw error;
  return (data ?? []).map((e) => ({
    alert_type: e.signature_verified === false ? "webhook_signature_failed" : "webhook_processing_error",
    severity: e.signature_verified === false ? ("critical" as const) : ("warning" as const),
    title: `Stripe webhook ${e.signature_verified === false ? "signature failed" : "error"}: ${e.event_type}`,
    details: {
      processing_status: e.processing_status,
      error_message: e.error_message,
      received_at: e.received_at,
    },
    related_booking_id: e.related_booking_id,
    related_event_id: e.event_id,
    dedupe_key: `webhook:${e.event_id}`,
  }));
}

async function scanBookingInconsistencies(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const nowIso = new Date().toISOString();

  // 1. payment_status=paid but payment_intent_id is null
  const { data: paidNoPi, error: e1 } = await admin
    .from("bookings")
    .select("id, status, payment_status, total_price")
    .eq("payment_status", "paid")
    .is("payment_intent_id", null)
    .limit(200);
  if (e1) throw e1;
  for (const b of paidNoPi ?? []) {
    alerts.push({
      alert_type: "inconsistency_paid_no_pi",
      severity: "critical",
      title: `Booking marked paid without Stripe PaymentIntent`,
      details: { booking_id: b.id, status: b.status, total_price: b.total_price },
      related_booking_id: b.id,
      dedupe_key: `paid_no_pi:${b.id}`,
    });
  }

  // 2. status=completed without business_signature
  const { data: completedNoSig, error: e2 } = await admin
    .from("bookings")
    .select("id, status, business_signature")
    .eq("status", "completed")
    .is("business_signature", null)
    .limit(200);
  if (e2) throw e2;
  for (const b of completedNoSig ?? []) {
    alerts.push({
      alert_type: "inconsistency_completed_no_signature",
      severity: "warning",
      title: `Completed booking missing business signature`,
      details: { booking_id: b.id },
      related_booking_id: b.id,
      dedupe_key: `completed_no_sig:${b.id}`,
    });
  }

  // 3. paid + status=cancelled + no refund
  const { data: paidCancelled, error: e3 } = await admin
    .from("bookings")
    .select("id, status, payment_status, total_price, refunded_amount")
    .eq("payment_status", "paid")
    .eq("status", "cancelled")
    .limit(200);
  if (e3) throw e3;
  for (const b of paidCancelled ?? []) {
    if ((Number(b.refunded_amount) || 0) < Number(b.total_price)) {
      alerts.push({
        alert_type: "inconsistency_paid_cancelled_unrefunded",
        severity: "critical",
        title: `Cancelled booking still paid (no/partial refund)`,
        details: { total_price: b.total_price, refunded_amount: b.refunded_amount },
        related_booking_id: b.id,
        dedupe_key: `paid_cancelled:${b.id}`,
      });
    }
  }

  // 4. pending past auto_cancel_at
  const { data: stuckPending, error: e4 } = await admin
    .from("bookings")
    .select("id, status, auto_cancel_at")
    .eq("status", "pending")
    .lt("auto_cancel_at", nowIso)
    .limit(200);
  if (e4) throw e4;
  for (const b of stuckPending ?? []) {
    alerts.push({
      alert_type: "inconsistency_pending_past_auto_cancel",
      severity: "warning",
      title: `Pending booking past 24h auto-cancel window`,
      details: { auto_cancel_at: b.auto_cancel_at },
      related_booking_id: b.id,
      dedupe_key: `stuck_pending:${b.id}`,
    });
  }

  return alerts;
}

async function insertAlerts(alerts: Alert[]) {
  if (alerts.length === 0) return { inserted: 0, duplicates: 0 };
  let inserted = 0;
  let duplicates = 0;
  // Insert one-by-one so unique-key conflicts only skip the dupe, not the batch.
  for (const a of alerts) {
    const { error } = await admin.from("monitoring_alerts").insert(a);
    if (!error) inserted++;
    else if (error.code === "23505") duplicates++;
    else console.error("insert alert failed", error, a.dedupe_key);
  }
  return { inserted, duplicates };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const [failedPayments, webhookErrors, inconsistencies] = await Promise.all([
      scanFailedPayments(),
      scanWebhookErrors(),
      scanBookingInconsistencies(),
    ]);
    const all = [...failedPayments, ...webhookErrors, ...inconsistencies];
    const result = await insertAlerts(all);

    const summary = {
      scanned_at: new Date().toISOString(),
      detected: {
        failed_payments: failedPayments.length,
        webhook_errors: webhookErrors.length,
        booking_inconsistencies: inconsistencies.length,
        total: all.length,
      },
      ...result,
    };
    console.log("monitoring-scan", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("monitoring-scan error", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
