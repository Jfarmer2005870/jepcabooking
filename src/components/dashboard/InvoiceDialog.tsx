import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Calendar, Clock, Eraser } from "lucide-react";

export interface InvoiceBooking {
  id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  service_address: string | null;
  total_price: number | null;
  platform_fee: number | null;
  travel_fee: number | null;
  travel_distance_miles: number | null;
  business_signature: string | null;
  business_signature_at: string | null;
  business_signature_name: string | null;
  created_at: string;
  services?: { title: string } | null;
  business_profiles?: { business_name: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: InvoiceBooking | null;
  canSign?: boolean;
  onSigned?: () => void;
}

const fmt = (n: number | null | undefined) => `$${(Number(n) || 0).toFixed(2)}`;

const InvoiceDialog = ({ open, onOpenChange, booking, canSign, onSigned }: Props) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [signerName, setSignerName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setHasDrawn(false);
      setSignerName("");
    }
  }, [open]);

  if (!booking) return null;

  const total = Number(booking.total_price || 0);
  const platformFee = Number(booking.platform_fee || 0);
  const travelFee = Number(booking.travel_fee || 0);
  const subtotal = Math.max(0, total - platformFee - travelFee);
  const distance = booking.travel_distance_miles;

  const startDraw = (x: number, y: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDraw = (x: number, y: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clearPad = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  const saveSignature = async () => {
    if (!canvasRef.current || !hasDrawn) {
      toast({ title: "Please sign", description: "Draw your signature in the box.", variant: "destructive" });
      return;
    }
    if (!signerName.trim()) {
      toast({ title: "Printed name required", description: "Type your name to sign.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const { error } = await supabase
        .from("bookings")
        .update({
          business_signature: dataUrl,
          business_signature_name: signerName.trim(),
          business_signature_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      if (error) throw error;

      // Notify consumer with the signed invoice (best-effort)
      if (booking.profiles?.email) {
        try {
          const signedAt = new Date();
          const platformFee = Number(booking.platform_fee || 0);
          const travelFee = Number(booking.travel_fee || 0);
          const total = Number(booking.total_price || 0);
          const servicePrice = Math.max(0, total - platformFee - travelFee);
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "invoice-signed",
              recipientEmail: booking.profiles.email,
              idempotencyKey: `invoice-signed-${booking.id}`,
              templateData: {
                serviceName: booking.services?.title,
                businessName: booking.business_profiles?.business_name,
                invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
                scheduledDate: booking.scheduled_date
                  ? new Date(booking.scheduled_date).toLocaleDateString()
                  : undefined,
                scheduledTime: booking.scheduled_time || undefined,
                serviceAddress: booking.service_address || undefined,
                servicePrice: servicePrice.toFixed(2),
                travelDistanceMiles:
                  booking.travel_distance_miles != null
                    ? Number(booking.travel_distance_miles).toFixed(1)
                    : undefined,
                travelFee: travelFee.toFixed(2),
                platformFee: platformFee.toFixed(2),
                total: total.toFixed(2),
                signedByName: signerName.trim(),
                signedAt: signedAt.toLocaleString(),
                invoiceUrl: `${window.location.origin}/dashboard`,
              },
            },
          });
        } catch (mailErr) {
          console.error("Failed to send invoice email:", mailErr);
        }
      }

      toast({ title: "Invoice signed", description: "Your signature has been saved and emailed to the customer." });
      onSigned?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save signature", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const showSignPad = canSign && !booking.business_signature;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice</DialogTitle>
          <DialogDescription>
            {booking.business_profiles?.business_name || "Service Provider"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Invoice #{booking.id.slice(0, 8).toUpperCase()}</span>
            <span>{new Date(booking.created_at).toLocaleDateString()}</span>
          </div>

          <div className="rounded-md border p-3 space-y-1">
            <p className="font-medium text-foreground">{booking.services?.title}</p>
            <p className="text-muted-foreground">
              For: {booking.profiles?.full_name || booking.profiles?.email || "Customer"}
            </p>
            {booking.scheduled_date && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(booking.scheduled_date).toLocaleDateString()}
                {booking.scheduled_time && (
                  <>
                    <Clock className="w-3.5 h-3.5 ml-2" /> {booking.scheduled_time}
                  </>
                )}
              </p>
            )}
            {booking.service_address && (
              <p className="flex items-start gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5" />
                <span>{booking.service_address}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Travel{distance != null ? ` (${Number(distance).toFixed(1)} mi)` : ""}
              </span>
              <span>{fmt(travelFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee (5%)</span>
              <span>{fmt(platformFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">{fmt(total)}</span>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Provider Signature
            </p>
            {booking.business_signature ? (
              <div className="space-y-1">
                <img
                  src={booking.business_signature}
                  alt="Provider signature"
                  className="border rounded-md bg-background max-h-32"
                />
                <p className="text-xs text-muted-foreground">
                  Signed by {booking.business_signature_name} on{" "}
                  {booking.business_signature_at
                    ? new Date(booking.business_signature_at).toLocaleString()
                    : ""}
                </p>
              </div>
            ) : showSignPad ? (
              <div className="space-y-2">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={140}
                  className="w-full border rounded-md bg-background touch-none"
                  onPointerDown={(e) => {
                    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                    const p = getPos(e);
                    startDraw(p.x, p.y);
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons !== 1) return;
                    const p = getPos(e);
                    moveDraw(p.x, p.y);
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Printed name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={clearPad}>
                    <Eraser className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Not yet signed by provider</p>
            )}
          </div>
        </div>

        <DialogFooter>
          {showSignPad ? (
            <Button onClick={saveSignature} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign & Save
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
