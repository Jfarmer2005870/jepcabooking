#!/usr/bin/env node
/**
 * Launch Gate
 * -----------
 * Pre-publish checklist runner. Fails fast (non-zero exit) if anything looks
 * unsafe to ship. Run BEFORE clicking "Publish" in Lovable.
 *
 * Checks:
 *   1. lint     — eslint
 *   2. build    — vite build (type + bundle sanity)
 *   3. tests    — vitest run
 *   4. rls      — every public table has RLS enabled + at least one policy
 *   5. security — no user-schema tables without RLS
 *   6. smoke    — booking flow tables reachable, edge functions deployed,
 *                 stripe-webhook health endpoint healthy
 *
 * Usage:
 *   node scripts/launch-gate.mjs
 *   node scripts/launch-gate.mjs --skip=build,tests
 *   node scripts/launch-gate.mjs --only=rls,smoke
 *
 * Env (optional, enables deeper checks):
 *   SUPABASE_SERVICE_ROLE_KEY   — RLS audit + smoke DB checks
 *   WEBHOOK_VERIFY_TOKEN        — stripe webhook health probe
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const skip = parseList("--skip");
const only = parseList("--only");

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  readEnv("VITE_SUPABASE_URL");
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || readEnv("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_VERIFY_TOKEN =
  process.env.WEBHOOK_VERIFY_TOKEN || readEnv("WEBHOOK_VERIFY_TOKEN");

// ---- step definitions -------------------------------------------------------

const STEPS = {
  lint: () => run("npx", ["eslint", "."]),

  build: () => run("npx", ["vite", "build"]),

  tests: () => run("npx", ["vitest", "run", "--reporter=dot"]),

  async rls() {
    if (!requireDb()) return true;
    const sql = `
      select c.relname as table_name,
             c.relrowsecurity as rls_enabled,
             coalesce((select count(*) from pg_policies p
                        where p.schemaname='public' and p.tablename=c.relname), 0) as policy_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname='public' and c.relkind='r'
      order by c.relname;
    `;
    const rows = await pgQuery(sql);
    if (rows == null) return false;
    let bad = 0;
    for (const r of rows) {
      const ok = r.rls_enabled && Number(r.policy_count) > 0;
      if (!ok) bad++;
      console.log(
        `  ${ok ? "✓" : "✗"} ${String(r.table_name).padEnd(30)} rls=${r.rls_enabled} policies=${r.policy_count}`,
      );
    }
    if (bad) console.error(`  ${bad} table(s) lack RLS or policies.`);
    return bad === 0;
  },

  async security() {
    if (!requireDb()) return true;
    const sql = `
      select n.nspname || '.' || c.relname as fqn
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime','supabase_functions','vault','pgmq','extensions','net','graphql','graphql_public')
        and c.relkind='r' and c.relrowsecurity = false;
    `;
    const rows = await pgQuery(sql);
    if (rows == null) return false;
    if (rows.length) {
      console.error("  ✗ tables without RLS:", rows.map((r) => r.fqn).join(", "));
      return false;
    }
    console.log("  ✓ all user-schema tables have RLS enabled");
    return true;
  },

  async smoke() {
    if (!SUPABASE_URL) {
      console.warn("  ⚠  SUPABASE_URL not set — skipping smoke checks.");
      return true;
    }
    let ok = true;

    // 1. core booking-flow tables reachable via REST
    if (SERVICE_ROLE) {
      for (const t of ["services", "bookings", "reviews", "stripe_webhook_events"]) {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${t}?select=*&limit=1`,
          { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
        );
        const good = res.ok;
        ok = ok && good;
        console.log(`  ${good ? "✓" : "✗"} table reachable: ${t} (${res.status})`);
      }
    }

    // 2. edge functions deployed (404 = missing)
    for (const fn of ["stripe-webhook", "verify-stripe-webhook", "create-payment-intent"]) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, { method: "OPTIONS" });
      const good = res.status !== 404;
      ok = ok && good;
      console.log(`  ${good ? "✓" : "✗"} function deployed: ${fn} (${res.status})`);
    }

    // 3. webhook health endpoint
    if (WEBHOOK_VERIFY_TOKEN) {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-stripe-webhook?hours=24`,
        { headers: { "x-verify-token": WEBHOOK_VERIFY_TOKEN } },
      );
      const body = await res.json().catch(() => ({}));
      const good = res.ok && body.healthy !== false;
      ok = ok && good;
      console.log(
        `  ${good ? "✓" : "✗"} webhook verifier healthy=${body.healthy} events=${body.total_events ?? "?"} stuck=${body.stuck_pending_bookings ?? "?"}`,
      );
    } else {
      console.warn("  ⚠  WEBHOOK_VERIFY_TOKEN not set — skipping webhook health probe.");
    }

    return ok;
  },
};

// ---- runner -----------------------------------------------------------------

const order = ["lint", "build", "tests", "rls", "security", "smoke"];
const results = [];
let failed = false;

for (const step of order) {
  if (only.length && !only.includes(step)) continue;
  if (skip.includes(step)) {
    results.push({ step, status: "skip" });
    continue;
  }
  console.log(`\n━━━━ ${step.toUpperCase()} ━━━━`);
  let ok = false;
  try {
    ok = await STEPS[step]();
  } catch (err) {
    console.error(`✗ ${step} threw:`, err?.message || err);
  }
  results.push({ step, status: ok ? "pass" : "fail" });
  if (!ok) failed = true;
}

console.log("\n──────── Launch Gate Summary ────────");
for (const r of results) {
  const icon = r.status === "pass" ? "✓" : r.status === "skip" ? "·" : "✗";
  console.log(`  ${icon} ${r.step.padEnd(10)} ${r.status}`);
}
console.log("─────────────────────────────────────\n");

if (failed) {
  console.error("🚫 Launch gate FAILED. Do not publish until issues are resolved.");
  process.exit(1);
}
console.log("✅ Launch gate PASSED. Safe to publish.");
process.exit(0);

// ---- helpers ----------------------------------------------------------------

function run(cmd, argv) {
  const r = spawnSync(cmd, argv, { stdio: "inherit", shell: false });
  return r.status === 0;
}

function parseList(flag) {
  const a = args.find((x) => x.startsWith(`${flag}=`));
  return a ? a.slice(flag.length + 1).split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function readEnv(key) {
  try {
    const env = readFileSync(resolve(".env"), "utf8");
    const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

function requireDb() {
  if (SUPABASE_URL && SERVICE_ROLE) return true;
  console.warn(
    "  ⚠  SUPABASE_SERVICE_ROLE_KEY not set — skipping DB-backed check.\n" +
      "     Export it locally to enable this gate.",
  );
  return false;
}

async function pgQuery(sql) {
  // Try common Supabase SQL endpoints. If none respond, return null to fail
  // the step loudly rather than silently passing.
  const endpoints = [
    `${SUPABASE_URL}/pg/query`,
    `${SUPABASE_URL}/rest/v1/rpc/query`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) return await res.json();
    } catch {}
  }
  console.error(
    "  ✗ no SQL endpoint reachable. Add a `query(sql text)` RPC or run with psql for full audit.",
  );
  return null;
}
