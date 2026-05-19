import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { format, addDays } from "date-fns";

type ServiceRow = {
  id: string;
  title: string;
  business_id: string;
  price_min: number | null;
  price_type: string | null;
};

type BookingRow = {
  id: string;
  status: string;
  payment_status: string | null;
  payment_intent_id: string | null;
  total_price: number | null;
  platform_fee: number | null;
  created_at: string;
};

type WebhookRow = {
  event_id: string;
  event_type: string;
  processing_status: string;
  payment_intent_id: string | null;
  received_at: string;
};

const TEST_CARDS = [
  { label: "Success (Visa)", number: "4242 4242 4242 4242", note: "Charges immediately" },
  { label: "Requires 3DS", number: "4000 0027 6000 3184", note: "Triggers 3D-Secure modal" },
  { label: "Declined", number: "4000 0000 0000 9995", note: "Use to test failure path" },
];

export function GuidedTestBookingPanel() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [loadingServices, setLoadingServices] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,title,business_id,price_min,price_type")
        .eq("is_active", true)
        .not("price_min", "is", null)
        .limit(20);
      if (!error && data) {
        setServices(data as ServiceRow[]);
        if (data.length) setServiceId(data[0].id);
      }
      setLoadingServices(false);
    })();
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    toast({ title: "Copied", description: text });
  };

  const launchCheckout = async () => {
    if (!serviceId) return;
    setLaunching(true);
    setBooking(null);
    setWebhooks([]);
    try {
      const tomorrow = addDays(new Date(), 1);
      const { data, error } = await supabase.functions.invoke("create-booking-checkout", {
        body: {
          service_id: serviceId,
          scheduled_date: format(tomorrow, "yyyy-MM-dd"),
          scheduled_time: "10:00",
          service_address: "123 Test St, Test City",
          service_lat: null,
          service_lng: null,
          notes: "[GUIDED TEST BOOKING]",
          estimated_hours: 1,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.booking_id) setBookingId(data.booking_id);
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        toast({
          title: "Stripe Checkout opened",
          description: "Pay with a test card in the new tab, then come back and click Verify.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Could not start test booking",
        description: e.message || "See console",
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      // Fetch latest booking belonging to the current user, fall back to bookingId
      let query = supabase
        .from("bookings")
        .select("id,status,payment_status,payment_intent_id,total_price,platform_fee,created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (bookingId) query = query.eq("id", bookingId).limit(1) as typeof query;
      const { data: b, error: bErr } = await query.maybeSingle();
      if (bErr) throw bErr;
      setBooking(b as BookingRow | null);

      if (b?.payment_intent_id) {
        const { data: wh } = await supabase
          .from("stripe_webhook_events")
          .select("event_id,event_type,processing_status,payment_intent_id,received_at")
          .eq("payment_intent_id", b.payment_intent_id)
          .order("received_at", { ascending: false })
          .limit(10);
        setWebhooks((wh as WebhookRow[]) || []);
      }
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setBookingId(null);
    setBooking(null);
    setWebhooks([]);
  };

  const paid = booking?.payment_status === "paid";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Guided test booking
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Creates a real (test-mode) booking, opens Stripe Checkout in a new tab, and confirms the
          booking/payment fields after you pay with a test card. Safe — no real money moves.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1 */}
        <section className="space-y-2">
          <div className="text-sm font-semibold">1. Pick a service to book</div>
          {loadingServices ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
            </div>
          ) : services.length === 0 ? (
            <div className="text-sm text-destructive">
              No active services with a fixed price found. Create one first.
            </div>
          ) : (
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} — ${s.price_min}
                    {s.price_type === "hourly" ? "/hr" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </section>

        {/* Step 2 */}
        <section className="space-y-2">
          <div className="text-sm font-semibold">2. Launch Stripe Checkout</div>
          <Button onClick={launchCheckout} disabled={!serviceId || launching}>
            {launching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Open test checkout in new tab
          </Button>
          {bookingId && (
            <p className="text-xs text-muted-foreground font-mono">booking_id: {bookingId}</p>
          )}
        </section>

        {/* Step 3 */}
        <section className="space-y-2">
          <div className="text-sm font-semibold">3. Use a Stripe test card</div>
          <div className="border rounded-md divide-y">
            {TEST_CARDS.map((c) => (
              <div key={c.number} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Badge variant="outline" className="shrink-0">
                  {c.label}
                </Badge>
                <code className="font-mono">{c.number}</code>
                <span className="text-xs text-muted-foreground hidden sm:inline">{c.note}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => copy(c.number)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Any future expiry (e.g. <code>12/34</code>), any 3 digits CVC, any ZIP.
          </p>
        </section>

        {/* Step 4 */}
        <section className="space-y-3">
          <div className="text-sm font-semibold">4. Verify in the database</div>
          <div className="flex gap-2">
            <Button onClick={verify} disabled={verifying} variant="secondary">
              {verifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Verify last booking
            </Button>
            {(booking || bookingId) && (
              <Button onClick={reset} variant="ghost" size="sm">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            )}
          </div>

          {booking && (
            <div className="border rounded-md p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                {paid ? (
                  <Badge className="bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Payment confirmed
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {booking.payment_status || "no payment yet"}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground font-mono">{booking.id}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted-foreground">status</dt>
                <dd className="font-mono">{booking.status}</dd>
                <dt className="text-muted-foreground">payment_status</dt>
                <dd className="font-mono">{booking.payment_status ?? "—"}</dd>
                <dt className="text-muted-foreground">payment_intent_id</dt>
                <dd className="font-mono break-all">{booking.payment_intent_id ?? "—"}</dd>
                <dt className="text-muted-foreground">total_price</dt>
                <dd className="font-mono">${booking.total_price ?? "—"}</dd>
                <dt className="text-muted-foreground">platform_fee</dt>
                <dd className="font-mono">${booking.platform_fee ?? "—"}</dd>
              </dl>
              {!paid && (
                <p className="text-xs text-amber-600">
                  Not paid yet — finish the test checkout in the other tab, then click Verify again.
                  Webhooks can take a few seconds to arrive.
                </p>
              )}
            </div>
          )}

          {webhooks.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Stripe webhook events for this payment
              </div>
              <div className="border rounded-md divide-y text-xs">
                {webhooks.map((e) => (
                  <div key={e.event_id} className="px-3 py-2 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{e.event_type}</Badge>
                    <Badge
                      className={
                        e.processing_status === "booking_updated"
                          ? "bg-primary text-primary-foreground"
                          : "bg-amber-500 text-white"
                      }
                    >
                      {e.processing_status}
                    </Badge>
                    <span className="font-mono">{e.event_id}</span>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(e.received_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
