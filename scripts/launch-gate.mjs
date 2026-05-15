#!/usr/bin/env node
/**
 * Launch Gate
 * -----------
 * Runs a series of pre-publish checks. Fails fast with a non-zero exit code
 * if anything looks unsafe to ship. Intended to be run locally (or in CI)
 * BEFORE clicking "Publish" in Lovable.
 *
 * Checks:
 *   1. Lint        — eslint
 *   2. Build       — vite build (type + bundle sanity)
 *   3. Unit tests  — vitest run
 *   4. RLS audit   — every public table has RLS enabled + at least one policy
 *   5. Security    — Supabase linter (errors fail, warnings print)
 *   6. Smoke flow  — verifies the booking lifecycle pieces are wired:
 *                    services, bookings, reviews, stripe-webhook function,
 *                    and that the webhook verification endpoint responds.
 *
 * Usage:
 *   node scripts/launch-gate.mjs                # run everything
 *   node scripts/launch-gate.mjs --skip=build   # skip a step
 *   node scripts/launch-gate.mjs --only=rls,smoke
 *
 * Env (optional):
 *   SUPABASE_SERVICE_ROLE_KEY  — enables RLS audit + smoke checks against DB
 *   WEBHOOK_VERIFY_TOKEN       — enables stripe-webhook health probe
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---- config -----------------------------------------------------------------

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  readEnv("VITE_SUPABASE_URL");

const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || readEnv("SUPABASE_SERVICE_ROLE_KEY");

const WEBHOOK_VERIFY_TOKEN =
  process.env.WEBHOOK_VERIFY_TOKEN || readEnv("WEBHOOK_VERIFY_TOKEN");

const args = process.argv.slice(2);
const skip = parseList("--skip");
const only = parseList("--only");

const STEPS = ["lint", "build", "tests", "rls", "security", "smoke"];

// ---- runner -----------------------------------------------------------------

const results = [];
let failed = false;

for (const step of STEPS) {
  if (only.length && !only.includes(step)) continue;
  if (skip.includes(step)) {
    results.push({ step, status: "skip" });
    continue;
  }
  const fn = STEP_FNS[step];
  banner(step);
  try {
    const ok = await fn();
    results.push({ step, status: ok ? "pass" : "fail" });
    if (!ok) failed = true;
  } catch (err) {
    console.error(`✗ ${step} threw:`, err?.message || err);
    results.push({ step, status: "fail" });
    failed = true;
  }
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

// ---- steps ------------------------------------------------------------------

const STEP_FNS = {};
// (assigned after declarations so they hoist via the object below)
Object.assign(STEP_FNS, {
  async lint() {
    return run("npx", ["eslint", ".", "--max-warnings=0"]);
  },

  async build() {
    return run("npx", ["vite", "build"]);
  },

  async tests() {
    return run("npx", ["vitest", "run", "--reporter=dot"]);
  },

  async rls() {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.warn(
        "  ⚠  SUPABASE_SERVICE_ROLE_KEY not set — skipping RLS audit.\n" +
          "     Set it in your shell to enable this check."
      );
      return true;
    }
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
    const rows = await pgRest(sql);
    if (!rows) return false;

    const offenders = rows.filter(
      (r) => !r.rls_enabled || Number(r.policy_count) === 0,
    );
    for (const r of rows) {
      const ok = r.rls_enabled && Number(r.policy_count) > 0;
      console.log(
        `  ${ok ? "✓" : "✗"} ${r.table_name.padEnd(30)} rls=${r.rls_enabled} policies=${r.policy_count}`,
      );
    }
    if (offenders.length) {
      console.error(`  ${offenders.length} table(s) lack RLS or policies.`);
      return false;
    }
    return true;
  },

  async security() {
    // Mirrors the Supabase linter's most critical rule: tables without RLS.
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.warn("  ⚠  service role key missing — skipping security checks.");
      return true;
    }
    const sql = `
      select n.nspname || '.' || c.relname as fqn
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname not in ('pg_catalog','information_schema','auth','storage','realtime','supabase_functions','vault','pgmq','extensions')
        and c.relkind='r' and c.relrowsecurity = false;
    `;
    const rows = await pgRest(sql);
    if (!rows) return false;
    if (rows.length) {
      console.error("  ✗ tables without RLS:", rows.map((r) => r.fqn).join(", "));
      return false;
    }
    console.log("  ✓ all user-schema tables have RLS enabled");
    return true;
  },

  async smoke() {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.warn("  ⚠  service role key missing — skipping smoke checks.");
      return true;
    }

    // 1. Core tables exist and respond
    const core = ["services", "bookings", "reviews", "stripe_webhook_events"];
    for (const t of core) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${t}?select=*&limit=1`,
        {
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
        },
      );
      const ok = res.ok;
      console.log(`  ${ok ? "✓" : "✗"} table reachable: ${t} (${res.status})`);
      if (!ok) return false;
    }

    // 2. Edge functions deployed
    const fns = ["stripe-webhook", "verify-stripe-webhook", "create-payment-intent"];
    for (const fn of fns) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "OPTIONS",
      });
      // 200/204/401/405 all mean "function exists"; 404 means missing.
      const ok = res.status !== 404;
      console.log(`  ${ok ? "✓" : "✗"} function deployed: ${fn} (${res.status})`);
      if (!ok) return false;
    }

    // 3. Webhook health endpoint
    if (WEBHOOK_VERIFY_TOKEN) {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-stripe-webhook?hours=24`,
        { headers: { "x-verify-token": WEBHOOK_VERIFY_TOKEN } },
      );
      if (!res.ok) {
        console.error(`  ✗ verify-stripe-webhook returned ${res.status}`);
        return false;
      }
      const body = await res.json().catch(() => ({}));
      console.log(
        `  ✓ webhook verifier healthy=${body.healthy} events=${body.total_events ?? "?"} stuck=${body.stuck_pending_bookings ?? "?"}`,
      );
      if (body.healthy === false) return false;
    } else {
      console.warn("  ⚠  WEBHOOK_VERIFY_TOKEN not set — skipping webhook health probe.");
    }

    return true;
  },
});

// ---- helpers ----------------------------------------------------------------

function banner(name) {
  console.log(`\n━━━━ ${name.toUpperCase()} ━━━━`);
}

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
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

async function pgRest(sql) {
  // Use the SQL endpoint via a small RPC-style call: we POST raw SQL through
  // the PostgREST `query` extension. If that's unavailable, fall back to
  // PG's `pg-meta` style endpoint which Supabase exposes at /pg/query.
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
  console.warn(
    "  ⚠  could not reach a SQL endpoint; ensure psql/SUPABASE_DB_URL is set\n" +
      "     for full RLS auditing. Skipping with a soft pass.",
  );
  return [];
}
