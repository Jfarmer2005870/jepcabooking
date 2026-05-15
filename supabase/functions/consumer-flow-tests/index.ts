// Scripted runner for the consumer flow:
//   book → pay → reschedule → sign invoice → leave review
//
// Provisions ephemeral users + a business + a service via the admin API,
// drives every step server-side, asserts the database state at each
// checkpoint, and tears everything down. No browser auth required.
//
// Auth: pass header `x-verify-token: <WEBHOOK_VERIFY_TOKEN>`.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-verify-token",
};

type Step = { name: string; ok: boolean; detail?: string; ms: number };
type LogEntry = { level: "log" | "warn" | "error"; ts: string; msg: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function step<T>(
  name: string,
  steps: Step[],
  logs: LogEntry[],
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = performance.now();
  logs.push({ level: "log", ts: new Date().toISOString(), msg: `▶ ${name}` });
  try {
    const out = await fn();
    const ms = Math.round(performance.now() - t0);
    steps.push({ name, ok: true, ms });
    logs.push({ level: "log", ts: new Date().toISOString(), msg: `✓ ${name} (${ms}ms)` });
    return out;
  } catch (e) {
    const detail = e instanceof Error ? e.message : (typeof e === "object" ? JSON.stringify(e) : String(e));
    const ms = Math.round(performance.now() - t0);
    steps.push({ name, ok: false, detail, ms });
    logs.push({ level: "error", ts: new Date().toISOString(), msg: `✗ ${name}: ${detail}` });
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authorize: either x-verify-token (server-to-server) OR a JWT belonging to
  // a user with the `admin` role (used by the in-app smoke-test button).
  const verifyToken = Deno.env.get("WEBHOOK_VERIFY_TOKEN");
  const tokenHeader = req.headers.get("x-verify-token");
  const authHeader = req.headers.get("authorization") || "";

  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let authorized = !!verifyToken && tokenHeader === verifyToken;
  if (!authorized && authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    const { data: u } = await admin.auth.getUser(jwt);
    if (u?.user) {
      const { data: role } = await admin
        .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (role) authorized = true;
    }
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);


  const steps: Step[] = [];
  const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const consumerEmail = `e2e-consumer-${stamp}@example.test`;
  const businessEmail = `e2e-business-${stamp}@example.test`;
  const password = "TestPass!2345";

  let consumerId: string | undefined;
  let businessOwnerId: string | undefined;
  let businessId: string | undefined;
  let serviceId: string | undefined;
  let bookingId: string | undefined;

  const signedClient = async (email: string, pw: string) => {
    const c = createClient(SUPABASE_URL, ANON, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await c.auth.signInWithPassword({ email, password: pw });
    if (error) throw error;
    return c;
  };

  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(msg);
  };

  try {
    // ─── PROVISION ──────────────────────────────────────────────────────────
    await step("provision: create consumer + business + service", steps, async () => {
      const { data: c, error: ce } = await admin.auth.admin.createUser({
        email: consumerEmail, password, email_confirm: true,
      });
      if (ce) throw ce;
      consumerId = c.user!.id;

      const { data: b, error: be } = await admin.auth.admin.createUser({
        email: businessEmail, password, email_confirm: true,
      });
      if (be) throw be;
      businessOwnerId = b.user!.id;

      const { data: bp, error: bpe } = await admin.from("business_profiles").insert({
        user_id: businessOwnerId,
        business_name: `E2E Test Biz ${stamp}`,
        free_radius_miles: 10,
        per_mile_rate: 0,
      }).select("id").single();
      if (bpe) throw bpe;
      businessId = bp.id;

      const { data: svc, error: se } = await admin.from("services").insert({
        business_id: businessId,
        title: `E2E Service ${stamp}`,
        category: "other",
        price_type: "fixed",
        price_min: 100,
        is_active: true,
      }).select("id").single();
      if (se) throw se;
      serviceId = svc.id;
    });

    const consumer = await signedClient(consumerEmail, password);
    const business = await signedClient(businessEmail, password);

    // ─── 1. BOOK ────────────────────────────────────────────────────────────
    await step("book: consumer creates pending booking", steps, async () => {
      const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
      const { data, error } = await consumer.from("bookings").insert({
        service_id: serviceId,
        business_id: businessId,
        consumer_id: consumerId,
        status: "pending",
        total_price: 105,
        platform_fee: 5,
        payment_status: "pending",
        scheduled_date: tomorrow,
        scheduled_time: "09:00:00",
        service_address: "456 Invoice Ave, Springfield",
        notes: "Scripted E2E booking",
      }).select("id").single();
      if (error) throw error;
      bookingId = data.id;
    });

    // ─── 2. PAY (synthetic webhook event) ──────────────────────────────────
    await step("pay: webhook marks booking paid", steps, async () => {
      const pi = `pi_test_${crypto.randomUUID().slice(0, 8)}`;
      const { data: upd, error: piErr } = await admin.from("bookings")
        .update({ payment_intent_id: pi }).eq("id", bookingId!)
        .select("id, payment_intent_id").single();
      if (piErr) throw piErr;
      if (upd?.payment_intent_id !== pi) {
        throw new Error(`pi not persisted on booking ${bookingId} (got ${upd?.payment_intent_id})`);
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: `evt_${crypto.randomUUID().slice(0, 8)}`,
          type: "payment_intent.succeeded",
          data: { object: { id: pi, object: "payment_intent" } },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) throw new Error(`webhook status ${res.status}: ${JSON.stringify(body)}`);
      if (body.status !== "booking_updated") {
        throw new Error(`webhook status=${body.status} pi=${pi} booking=${bookingId} body=${JSON.stringify(body)}`);
      }

      const { data: row } = await admin.from("bookings")
        .select("payment_status").eq("id", bookingId!).single();
      assert(row?.payment_status === "paid", `expected paid, got ${row?.payment_status}`);
    });

    // Business accepts so they own the lifecycle
    await step("confirm: business confirms booking", steps, async () => {
      const { error } = await business.from("bookings")
        .update({ status: "confirmed" }).eq("id", bookingId!);
      if (error) throw error;
    });

    // ─── 3. RESCHEDULE ──────────────────────────────────────────────────────
    await step("reschedule: business moves to new slot", steps, async () => {
      const newDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
      const { error } = await business.from("bookings")
        .update({ scheduled_date: newDate, scheduled_time: "11:30:00" })
        .eq("id", bookingId!);
      if (error) throw error;

      const { data } = await admin.from("bookings")
        .select("scheduled_date, scheduled_time").eq("id", bookingId!).single();
      assert(data?.scheduled_date === newDate, "scheduled_date not updated");
      assert(String(data?.scheduled_time).slice(0, 5) === "11:30", "scheduled_time not updated");
    });

    // ─── 4. SIGN INVOICE ────────────────────────────────────────────────────
    await step("sign invoice: business completes + signs", steps, async () => {
      const { error } = await business.from("bookings").update({
        status: "completed",
        business_signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
        business_signature_name: "Provider Owner",
        business_signature_at: new Date().toISOString(),
        invoice_photos: ["https://example.test/invoice-1.jpg"],
      }).eq("id", bookingId!);
      if (error) throw error;

      const { data } = await admin.from("bookings")
        .select("status, business_signature, business_signature_name, invoice_photos")
        .eq("id", bookingId!).single();
      assert(data?.status === "completed", `status=${data?.status}`);
      assert(!!data?.business_signature, "missing business_signature");
      assert(data?.business_signature_name === "Provider Owner", "signature name mismatch");
      assert(Array.isArray(data?.invoice_photos) && data.invoice_photos.length === 1, "invoice_photos missing");
    });

    // ─── 5. REVIEW ──────────────────────────────────────────────────────────
    await step("review: consumer leaves 5-star review", steps, async () => {
      const { data, error } = await consumer.from("reviews").insert({
        booking_id: bookingId!,
        business_id: businessId!,
        consumer_id: consumerId!,
        rating: 5,
        comment: "Great work, on time and clean.",
      }).select("rating, comment").single();
      if (error) throw error;
      assert(data?.rating === 5, "rating mismatch");

      const { data: notif } = await admin.from("notifications")
        .select("type")
        .eq("user_id", consumerId!)
        .eq("related_id", bookingId!)
        .eq("type", "booking_completed")
        .maybeSingle();
      if (!notif) {
        // Soft warning — the notify_consumer_on_booking_completed trigger may
        // not be attached. Don't fail the scripted flow on a side-effect.
        console.warn("WARN: no booking_completed notification was emitted");
      }
    });

    return json({
      ok: true,
      summary: `${steps.filter(s => s.ok).length}/${steps.length} steps passed`,
      bookingId, consumerEmail, businessEmail,
      steps,
    });
  } catch (e) {
    return json({
      ok: false,
      error: e instanceof Error ? e.message : (typeof e === "object" ? JSON.stringify(e) : String(e)),
      steps,
    }, 500);
  } finally {
    // ─── TEARDOWN (best-effort) ────────────────────────────────────────────
    try {
      if (bookingId) {
        const { data: convs } = await admin.from("conversations")
          .select("id").eq("booking_id", bookingId);
        const convIds = (convs ?? []).map((c: { id: string }) => c.id);
        if (convIds.length) await admin.from("messages").delete().in("conversation_id", convIds);
        await admin.from("conversations").delete().eq("booking_id", bookingId);
        await admin.from("reviews").delete().eq("booking_id", bookingId);
        await admin.from("stripe_webhook_events").delete().eq("related_booking_id", bookingId);
        await admin.from("notifications").delete().eq("related_id", bookingId);
        await admin.from("booking_update_audit").delete().eq("booking_id", bookingId);
        await admin.from("bookings").delete().eq("id", bookingId);
      }
      if (serviceId) await admin.from("services").delete().eq("id", serviceId);
      if (businessId) await admin.from("business_profiles").delete().eq("id", businessId);
      if (consumerId) await admin.auth.admin.deleteUser(consumerId);
      if (businessOwnerId) await admin.auth.admin.deleteUser(businessOwnerId);
    } catch (_) { /* swallow teardown errors */ }
  }
});
