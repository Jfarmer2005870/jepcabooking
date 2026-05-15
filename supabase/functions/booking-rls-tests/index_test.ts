import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Tests require a service role key to provision fixtures (auth users + bookings).
// When run from the hosted test runner the service key is not exposed; in that case
// we skip with a clear message. Run locally with `supabase functions serve` or
// export SUPABASE_SERVICE_ROLE_KEY to execute the full integration suite.
const SKIP = !SUPABASE_URL || !ANON_KEY || !SERVICE_KEY;
const SKIP_REASON =
  "Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run booking RLS integration tests.";

const admin = SKIP
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

type Ctx = {
  consumerId: string;
  consumerEmail: string;
  consumerPassword: string;
  businessOwnerId: string;
  businessId: string;
  serviceId: string;
  bookingId: string;
};

async function setupFixtures(): Promise<Ctx> {
  const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const consumerEmail = `rls-consumer-${stamp}@example.test`;
  const businessEmail = `rls-business-${stamp}@example.test`;
  const consumerPassword = "TestPass!2345";
  const businessPassword = "TestPass!2345";

  const { data: consumer, error: ce } = await admin.auth.admin.createUser({
    email: consumerEmail,
    password: consumerPassword,
    email_confirm: true,
  });
  if (ce) throw ce;

  const { data: businessUser, error: be } = await admin.auth.admin.createUser({
    email: businessEmail,
    password: businessPassword,
    email_confirm: true,
  });
  if (be) throw be;

  const { data: bp, error: bpe } = await admin
    .from("business_profiles")
    .insert({ user_id: businessUser.user!.id, business_name: `RLS Test Biz ${stamp}` })
    .select("id")
    .single();
  if (bpe) throw bpe;

  const { data: svc, error: se } = await admin
    .from("services")
    .insert({
      business_id: bp.id,
      title: "RLS Test Service",
      category: "other",
      price_type: "fixed",
      price_min: 100,
    })
    .select("id")
    .single();
  if (se) throw se;

  const { data: booking, error: boe } = await admin
    .from("bookings")
    .insert({
      service_id: svc.id,
      business_id: bp.id,
      consumer_id: consumer.user!.id,
      status: "pending",
      total_price: 105,
      platform_fee: 5,
      payment_status: "unpaid",
      refunded_amount: 0,
    })
    .select("id")
    .single();
  if (boe) throw boe;

  return {
    consumerId: consumer.user!.id,
    consumerEmail,
    consumerPassword,
    businessOwnerId: businessUser.user!.id,
    businessId: bp.id,
    serviceId: svc.id,
    bookingId: booking.id,
  };
}

async function cleanup(ctx: Ctx) {
  await admin.from("bookings").delete().eq("id", ctx.bookingId);
  await admin.from("services").delete().eq("id", ctx.serviceId);
  await admin.from("business_profiles").delete().eq("id", ctx.businessId);
  await admin.auth.admin.deleteUser(ctx.consumerId);
  await admin.auth.admin.deleteUser(ctx.businessOwnerId);
}

async function consumerClient(ctx: Ctx) {
  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: ctx.consumerEmail,
    password: ctx.consumerPassword,
  });
  if (error) throw error;
  return client;
}

Deno.test({
  name: "consumer can update allowlisted booking fields (notes, signature, schedule)",
  ignore: SKIP,
  fn: async () => {
    if (SKIP) { console.log(SKIP_REASON); return; }
  const ctx = await setupFixtures();
  try {
    const client = await consumerClient(ctx);

    const { error: notesErr } = await client
      .from("bookings")
      .update({ notes: "Updated by consumer" })
      .eq("id", ctx.bookingId);
    assertEquals(notesErr, null, `notes update should succeed: ${notesErr?.message}`);

    const { error: sigErr } = await client
      .from("bookings")
      .update({
        consumer_signature: "data:image/png;base64,iVBORw0KGgo=",
        consumer_signature_name: "Test Consumer",
        consumer_signature_at: new Date().toISOString(),
      })
      .eq("id", ctx.bookingId);
    assertEquals(sigErr, null, `signature update should succeed: ${sigErr?.message}`);

    const { error: schedErr } = await client
      .from("bookings")
      .update({ scheduled_date: "2030-01-01", scheduled_time: "10:00:00" })
      .eq("id", ctx.bookingId);
    assertEquals(schedErr, null, `schedule update should succeed: ${schedErr?.message}`);
    } finally {
      await cleanup(ctx);
    }
  },
});

Deno.test({
  name: "consumer blocked-field updates are scrubbed and audit-logged",
  ignore: SKIP,
  fn: async () => {
    if (SKIP) { console.log(SKIP_REASON); return; }
    const ctx = await setupFixtures();
    try {
      const client = await consumerClient(ctx);

      const blockedAttempts: Array<[string, Record<string, unknown>]> = [
        ["status", { status: "completed" }],
        ["total_price", { total_price: 1 }],
        ["platform_fee", { platform_fee: 0 }],
        ["payment_status", { payment_status: "paid" }],
        ["refunded_amount", { refunded_amount: 9999 }],
      ];

      for (const [label, payload] of blockedAttempts) {
        // Combine a blocked field with an allowed field to ensure allowed
        // changes still apply while blocked changes are silently scrubbed.
        const note = `attempt-${label}-${Date.now()}`;
        const { error } = await client
          .from("bookings")
          .update({ ...payload, notes: note })
          .eq("id", ctx.bookingId);
        assertEquals(error, null, `update should not error for ${label}: ${error?.message}`);
      }

      // Sensitive fields must remain untouched
      const { data: fresh } = await admin
        .from("bookings")
        .select("status,total_price,platform_fee,payment_status,refunded_amount,notes")
        .eq("id", ctx.bookingId)
        .single();
      assertEquals(fresh?.status, "pending");
      assertEquals(Number(fresh?.total_price), 105);
      assertEquals(Number(fresh?.platform_fee), 5);
      assertEquals(fresh?.payment_status, "unpaid");
      assertEquals(Number(fresh?.refunded_amount), 0);
      assert((fresh?.notes ?? "").startsWith("attempt-"), "allowed notes update should have applied");

      // Audit log should contain one row per blocked attempt with the right field
      const { data: audit, error: auditErr } = await admin
        .from("booking_update_audit")
        .select("rejected_fields,attempted_values")
        .eq("booking_id", ctx.bookingId)
        .order("created_at", { ascending: true });
      assertEquals(auditErr, null, `audit query should succeed: ${auditErr?.message}`);
      assertEquals(audit?.length, blockedAttempts.length, "one audit row per blocked attempt");
      for (let i = 0; i < blockedAttempts.length; i++) {
        const [label] = blockedAttempts[i];
        const row = audit![i] as { rejected_fields: string[]; attempted_values: Record<string, unknown> };
        assert(row.rejected_fields.includes(label), `audit row ${i} should record field ${label}`);
        assert(label in row.attempted_values, `audit row ${i} should capture attempted value for ${label}`);
      }
    } finally {
      // Audit rows reference booking_id but have no FK; clean them up explicitly
      await admin.from("booking_update_audit").delete().eq("booking_id", ctx.bookingId);
      await cleanup(ctx);
    }
  },
});
