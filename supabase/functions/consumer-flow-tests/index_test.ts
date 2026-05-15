// End-to-end consumer flow:
//   browse → book → pay → confirm → reschedule → chat
//
// Provisions a real consumer + business + service via the admin API, drives
// each step as the appropriate authenticated user, and asserts the database
// reflects the expected state at every checkpoint. Cleans up everything on
// completion (success or failure).
//
// Skips when SUPABASE_SERVICE_ROLE_KEY is not exposed to the test runner.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SKIP = !SUPABASE_URL || !ANON_KEY || !SERVICE_KEY;
const SKIP_REASON =
  "Set SUPABASE_SERVICE_ROLE_KEY (plus VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY) to run consumer-flow E2E tests.";

const admin = SKIP
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

type Fixtures = {
  consumerId: string;
  consumerEmail: string;
  consumerPassword: string;
  businessOwnerId: string;
  businessOwnerEmail: string;
  businessOwnerPassword: string;
  businessId: string;
  serviceId: string;
  serviceTitle: string;
};

async function provision(): Promise<Fixtures> {
  const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const consumerEmail = `e2e-consumer-${stamp}@example.test`;
  const businessOwnerEmail = `e2e-business-${stamp}@example.test`;
  const password = "TestPass!2345";

  const { data: consumer, error: ce } = await admin.auth.admin.createUser({
    email: consumerEmail,
    password,
    email_confirm: true,
  });
  if (ce) throw ce;

  const { data: businessUser, error: be } = await admin.auth.admin.createUser({
    email: businessOwnerEmail,
    password,
    email_confirm: true,
  });
  if (be) throw be;

  const { data: bp, error: bpe } = await admin
    .from("business_profiles")
    .insert({
      user_id: businessUser.user!.id,
      business_name: `E2E Test Biz ${stamp}`,
      free_radius_miles: 10,
      per_mile_rate: 0,
    })
    .select("id")
    .single();
  if (bpe) throw bpe;

  const serviceTitle = `E2E Service ${stamp}`;
  const { data: svc, error: se } = await admin
    .from("services")
    .insert({
      business_id: bp.id,
      title: serviceTitle,
      category: "other",
      price_type: "fixed",
      price_min: 100,
      is_active: true,
    })
    .select("id")
    .single();
  if (se) throw se;

  return {
    consumerId: consumer.user!.id,
    consumerEmail,
    consumerPassword: password,
    businessOwnerId: businessUser.user!.id,
    businessOwnerEmail,
    businessOwnerPassword: password,
    businessId: bp.id,
    serviceId: svc.id,
    serviceTitle,
  };
}

async function teardown(f: Fixtures, bookingId?: string) {
  if (bookingId) {
    await admin.from("messages").delete().in(
      "conversation_id",
      (
        await admin.from("conversations").select("id").eq("booking_id", bookingId)
      ).data?.map((c: { id: string }) => c.id) ?? [],
    );
    await admin.from("conversations").delete().eq("booking_id", bookingId);
    await admin.from("stripe_webhook_events").delete().eq("related_booking_id", bookingId);
    await admin.from("notifications").delete().eq("related_id", bookingId);
    await admin.from("booking_update_audit").delete().eq("booking_id", bookingId);
    await admin.from("bookings").delete().eq("id", bookingId);
  }
  await admin.from("services").delete().eq("id", f.serviceId);
  await admin.from("business_profiles").delete().eq("id", f.businessId);
  await admin.auth.admin.deleteUser(f.consumerId);
  await admin.auth.admin.deleteUser(f.businessOwnerId);
}

async function signedClient(email: string, password: string) {
  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

Deno.test({
  name: "consumer flow: browse → book → pay → confirm → reschedule → chat",
  ignore: SKIP,
  fn: async () => {
    if (SKIP) { console.log(SKIP_REASON); return; }

    const f = await provision();
    let bookingId: string | undefined;

    try {
      const consumer = await signedClient(f.consumerEmail, f.consumerPassword);
      const business = await signedClient(f.businessOwnerEmail, f.businessOwnerPassword);

      // ─── 1. BROWSE ────────────────────────────────────────────────────────
      const { data: services, error: browseErr } = await consumer
        .from("services")
        .select("id, title, business_id, is_active")
        .eq("id", f.serviceId)
        .maybeSingle();
      assertEquals(browseErr, null, `browse should succeed: ${browseErr?.message}`);
      assert(services, "service should be visible in marketplace");
      assertEquals(services!.is_active, true);
      assertEquals(services!.title, f.serviceTitle);

      // ─── 2. BOOK ──────────────────────────────────────────────────────────
      const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
      const { data: booking, error: bookErr } = await consumer
        .from("bookings")
        .insert({
          service_id: f.serviceId,
          business_id: f.businessId,
          consumer_id: f.consumerId,
          status: "pending",
          total_price: 105,
          platform_fee: 5,
          payment_status: "pending",
          scheduled_date: tomorrow,
          scheduled_time: "10:00:00",
          service_address: "123 Test Lane, Springfield",
          notes: "E2E booking",
        })
        .select("id")
        .single();
      assertEquals(bookErr, null, `book should succeed: ${bookErr?.message}`);
      assert(booking, "booking should be created");
      bookingId = booking!.id;

      // ─── 3. PAY ───────────────────────────────────────────────────────────
      // Attach a synthetic payment_intent_id to the booking, then deliver a
      // payment_intent.succeeded event to the webhook (unsigned in test env;
      // the webhook still processes and marks it `signature_verified=false`).
      const pi = `pi_test_e2e_${crypto.randomUUID().slice(0, 8)}`;
      const { error: piErr } = await admin
        .from("bookings")
        .update({ payment_intent_id: pi })
        .eq("id", bookingId);
      assertEquals(piErr, null, `attach payment_intent should succeed: ${piErr?.message}`);

      const evtId = `evt_e2e_${crypto.randomUUID().slice(0, 8)}`;
      const webhookRes = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: evtId,
          type: "payment_intent.succeeded",
          data: { object: { id: pi, object: "payment_intent" } },
        }),
      });
      const webhookBody = await webhookRes.json().catch(() => ({}));
      assertEquals(webhookRes.status, 200, `webhook should accept event: ${webhookRes.status}`);
      assertEquals(webhookBody.status, "booking_updated");
      assertEquals(webhookBody.booking_id, bookingId);

      const { data: paid } = await admin
        .from("bookings").select("payment_status").eq("id", bookingId).single();
      assertEquals(paid!.payment_status, "paid", "booking should be marked paid after webhook");

      // ─── 4. CONFIRM (business accepts) ───────────────────────────────────
      const { error: confirmErr } = await business
        .from("bookings")
        .update({ status: "accepted" })
        .eq("id", bookingId);
      assertEquals(confirmErr, null, `business should be able to accept: ${confirmErr?.message}`);

      const { data: confirmed } = await admin
        .from("bookings").select("status").eq("id", bookingId).single();
      assertEquals(confirmed!.status, "accepted");

      // ─── 5. RESCHEDULE ───────────────────────────────────────────────────
      const reschedDate = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
      const { error: reschedErr } = await business
        .from("bookings")
        .update({ scheduled_date: reschedDate, scheduled_time: "14:30:00" })
        .eq("id", bookingId);
      assertEquals(reschedErr, null, `reschedule should succeed: ${reschedErr?.message}`);

      const { data: rescheduled } = await admin
        .from("bookings")
        .select("scheduled_date, scheduled_time")
        .eq("id", bookingId).single();
      assertEquals(rescheduled!.scheduled_date, reschedDate);
      assertEquals(String(rescheduled!.scheduled_time).slice(0, 5), "14:30");

      // ─── 6. CHAT ─────────────────────────────────────────────────────────
      // Consumer starts the conversation
      const { data: convo, error: convoErr } = await consumer
        .from("conversations")
        .insert({
          consumer_id: f.consumerId,
          business_id: f.businessId,
          booking_id: bookingId,
        })
        .select("id")
        .single();
      assertEquals(convoErr, null, `consumer should start conversation: ${convoErr?.message}`);

      const { error: msg1Err } = await consumer.from("messages").insert({
        conversation_id: convo!.id,
        sender_id: f.consumerId,
        content: "Hi, see you tomorrow!",
      });
      assertEquals(msg1Err, null, `consumer message should send: ${msg1Err?.message}`);

      // Business sees the conversation and replies
      const { data: bizConvos, error: bizConvErr } = await business
        .from("conversations").select("id").eq("id", convo!.id).maybeSingle();
      assertEquals(bizConvErr, null);
      assert(bizConvos, "business should see the conversation");

      const { error: msg2Err } = await business.from("messages").insert({
        conversation_id: convo!.id,
        sender_id: f.businessOwnerId,
        content: "Got it — confirmed.",
      });
      assertEquals(msg2Err, null, `business reply should send: ${msg2Err?.message}`);

      // Consumer sees both messages in order
      const { data: thread, error: threadErr } = await consumer
        .from("messages")
        .select("sender_id, content")
        .eq("conversation_id", convo!.id)
        .order("created_at", { ascending: true });
      assertEquals(threadErr, null);
      assertEquals(thread!.length, 2, "consumer should see both messages");
      assertEquals(thread![0].sender_id, f.consumerId);
      assertEquals(thread![1].sender_id, f.businessOwnerId);
      assertEquals(thread![1].content, "Got it — confirmed.");
    } finally {
      await teardown(f, bookingId);
    }
  },
});

Deno.test({
  name: "consumer flow: book → pay → reschedule → sign invoice → leave review",
  ignore: SKIP,
  fn: async () => {
    if (SKIP) { console.log(SKIP_REASON); return; }

    const f = await provision();
    let bookingId: string | undefined;

    try {
      const consumer = await signedClient(f.consumerEmail, f.consumerPassword);
      const business = await signedClient(f.businessOwnerEmail, f.businessOwnerPassword);

      // ─── 1. BOOK ──────────────────────────────────────────────────────────
      const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
      const { data: booking, error: bookErr } = await consumer
        .from("bookings")
        .insert({
          service_id: f.serviceId,
          business_id: f.businessId,
          consumer_id: f.consumerId,
          status: "pending",
          total_price: 105,
          platform_fee: 5,
          payment_status: "pending",
          scheduled_date: tomorrow,
          scheduled_time: "09:00:00",
          service_address: "456 Invoice Ave, Springfield",
          notes: "Invoice + review E2E",
        })
        .select("id")
        .single();
      assertEquals(bookErr, null, `book should succeed: ${bookErr?.message}`);
      bookingId = booking!.id;

      // ─── 2. PAY (via webhook) ────────────────────────────────────────────
      const pi = `pi_test_inv_${crypto.randomUUID().slice(0, 8)}`;
      await admin.from("bookings").update({ payment_intent_id: pi }).eq("id", bookingId);

      const evtId = `evt_inv_${crypto.randomUUID().slice(0, 8)}`;
      const webhookRes = await fetch(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: evtId,
          type: "payment_intent.succeeded",
          data: { object: { id: pi, object: "payment_intent" } },
        }),
      });
      await webhookRes.json().catch(() => ({}));
      assertEquals(webhookRes.status, 200, "webhook should accept event");

      const { data: paid } = await admin
        .from("bookings").select("payment_status").eq("id", bookingId).single();
      assertEquals(paid!.payment_status, "paid");

      // Business accepts so they own the booking lifecycle
      await business.from("bookings").update({ status: "accepted" }).eq("id", bookingId);

      // ─── 3. RESCHEDULE ───────────────────────────────────────────────────
      const reschedDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
      const { error: reschedErr } = await business
        .from("bookings")
        .update({ scheduled_date: reschedDate, scheduled_time: "11:30:00" })
        .eq("id", bookingId);
      assertEquals(reschedErr, null, `reschedule should succeed: ${reschedErr?.message}`);

      // ─── 4. SIGN INVOICE (business marks completed + signs) ──────────────
      const signedAt = new Date().toISOString();
      const { error: signErr } = await business
        .from("bookings")
        .update({
          status: "completed",
          business_signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
          business_signature_name: "Provider Owner",
          business_signature_at: signedAt,
          invoice_photos: ["https://example.test/invoice-photo-1.jpg"],
        })
        .eq("id", bookingId);
      assertEquals(signErr, null, `business sign invoice should succeed: ${signErr?.message}`);

      const { data: signed } = await admin
        .from("bookings")
        .select("status, business_signature, business_signature_name, business_signature_at, invoice_photos")
        .eq("id", bookingId).single();
      assertEquals(signed!.status, "completed");
      assert(signed!.business_signature, "business_signature should be persisted");
      assertEquals(signed!.business_signature_name, "Provider Owner");
      assert(signed!.business_signature_at, "business_signature_at should be set");
      assertEquals((signed!.invoice_photos as string[]).length, 1);

      // ─── 5. LEAVE REVIEW (consumer) ──────────────────────────────────────
      const { data: review, error: reviewErr } = await consumer
        .from("reviews")
        .insert({
          booking_id: bookingId,
          business_id: f.businessId,
          consumer_id: f.consumerId,
          rating: 5,
          comment: "Great work, on time and clean.",
        })
        .select("id, rating, comment")
        .single();
      assertEquals(reviewErr, null, `review insert should succeed: ${reviewErr?.message}`);
      assertEquals(review!.rating, 5);
      assertEquals(review!.comment, "Great work, on time and clean.");

      // Consumer should be notified that the job is complete (review prompt)
      const { data: notif } = await admin
        .from("notifications")
        .select("type")
        .eq("user_id", f.consumerId)
        .eq("related_id", bookingId)
        .eq("type", "booking_completed")
        .maybeSingle();
      assert(notif, "consumer should receive booking_completed notification");

      // Cleanup review (teardown handles the rest)
      await admin.from("reviews").delete().eq("booking_id", bookingId);
    } finally {
      await teardown(f, bookingId);
    }
  },
});
