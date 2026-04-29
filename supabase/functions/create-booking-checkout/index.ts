import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 5;

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

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { service_id, scheduled_date, scheduled_time, service_address, notes, estimated_hours } = await req.json();

    if (!service_id) throw new Error("Service ID is required");

    // Get service and business info
    const { data: service, error: serviceError } = await supabaseClient
      .from("services")
      .select("*, business_profiles(id, stripe_account_id, business_name)")
      .eq("id", service_id)
      .maybeSingle();

    if (serviceError || !service) throw new Error("Service not found");

    const businessProfile = service.business_profiles;
    if (!businessProfile?.stripe_account_id) {
      throw new Error("This service provider has not set up payments yet. Please contact them directly.");
    }

    // Calculate prices based on pricing type (in cents)
    const baseRate = service.price_min || 0;
    let servicePrice: number;

    if (service.price_type === "hourly") {
      const hours = estimated_hours || 1;
      servicePrice = baseRate * hours;
    } else {
      servicePrice = baseRate;
    }

    const servicePriceCents = Math.round(servicePrice * 100);
    const platformFeeCents = Math.round(servicePriceCents * PLATFORM_FEE_PERCENT / 100);
    const totalCents = servicePriceCents + platformFeeCents;

    // Check/create Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create the booking first (pending status)
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        service_id,
        consumer_id: user.id,
        business_id: businessProfile.id,
        scheduled_date,
        scheduled_time,
        service_address,
        notes: notes || null,
        total_price: totalCents / 100,
        platform_fee: platformFeeCents / 100,
        status: "pending",
      })
      .select()
      .single();

    if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`);

    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Create checkout session with Stripe Connect
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: service.title,
              description: service.price_type === "hourly"
                ? `${estimated_hours || 1} hour(s) @ $${baseRate}/hr — Service by ${businessProfile.business_name}`
                : `Service by ${businessProfile.business_name}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        capture_method: "manual",
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: businessProfile.stripe_account_id,
        },
      },
      success_url: `${origin}/dashboard?booking_success=true`,
      cancel_url: `${origin}/services/${service_id}?booking_cancelled=true`,
      metadata: {
        booking_id: booking.id,
        service_id,
        consumer_id: user.id,
        business_id: businessProfile.id,
      },
    });

    // Update booking with payment intent
    if (session.payment_intent) {
      await supabaseClient
        .from("bookings")
        .update({ payment_intent_id: session.payment_intent as string })
        .eq("id", booking.id);
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      booking_id: booking.id,
      total: totalCents / 100,
      platform_fee: platformFeeCents / 100,
      service_price: servicePrice,
    }), {
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
