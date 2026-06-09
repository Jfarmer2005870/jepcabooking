import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPTS: Record<string, string> = {
  describe_service:
    "You write polished, trustworthy service listings for a US field-service marketplace. Output: 2-4 short sentences (max ~80 words). Friendly, concrete, no marketing fluff, no emojis, no headings. Highlight what's included and who it's for.",
  summarize_notes:
    "You summarize a customer's booking notes for a busy field-service provider. Output: 1-2 short sentences. Plain text, no headings, no bullets, no emojis. Capture the actual job details (what, where specifics, special access, urgency).",
  review_insights:
    "You analyze customer reviews for a field-service business. Identify recurring strengths and concerns. Use the provided tool to return structured themes. Be concise and concrete.",
  category_helper:
    "You help homeowners pick the right service category on a field-service marketplace. Available categories: cleaning, plumbing, electrical, landscaping, painting, moving, handyman, hvac, pest_control, other. Ask up to 1 short clarifying question if needed; otherwise recommend the best category and briefly explain. Keep replies under 60 words.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated Supabase user so we don't burn AI credits
    // for anonymous callers.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { action, payload, messages } = await req.json();
    if (!action || !SYSTEM_PROMPTS[action]) throw new Error("Invalid action");

    const body: Record<string, unknown> = {
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPTS[action] }],
    };

    if (action === "describe_service") {
      const { title, category, price_type, price_min, includes } = payload || {};
      if (!title) throw new Error("title required");
      body.messages = [
        ...(body.messages as any[]),
        {
          role: "user",
          content: `Write a description for this service.
Title: ${title}
Category: ${category || "other"}
Pricing: ${price_type || "fixed"}${price_min ? ` starting at $${price_min}` : ""}
Notes from provider: ${includes || "(none)"}`,
        },
      ];
    } else if (action === "summarize_notes") {
      const { notes } = payload || {};
      if (!notes) throw new Error("notes required");
      body.messages = [...(body.messages as any[]), { role: "user", content: notes }];
    } else if (action === "review_insights") {
      const { reviews } = payload || {};
      if (!Array.isArray(reviews) || reviews.length === 0) {
        throw new Error("reviews array required");
      }
      const formatted = reviews
        .map((r: any, i: number) => `${i + 1}. [${r.rating}/5] ${r.comment || "(no comment)"}`)
        .join("\n");
      body.messages = [
        ...(body.messages as any[]),
        { role: "user", content: `Analyze these reviews:\n${formatted}` },
      ];
      body.tools = [
        {
          type: "function",
          function: {
            name: "review_summary",
            description: "Return structured theme analysis of reviews.",
            parameters: {
              type: "object",
              properties: {
                strengths: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-5 short positive themes (1-3 words each).",
                },
                concerns: {
                  type: "array",
                  items: { type: "string" },
                  description: "0-4 short improvement themes (1-3 words each).",
                },
                summary: {
                  type: "string",
                  description: "One short sentence overall summary.",
                },
              },
              required: ["strengths", "concerns", "summary"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "review_summary" } };
    } else if (action === "category_helper") {
      if (!Array.isArray(messages)) throw new Error("messages array required");
      body.messages = [
        ...(body.messages as any[]),
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ];
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const choice = data.choices?.[0];

    if (action === "review_insights") {
      const args = choice?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : null;
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result: choice?.message?.content || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
