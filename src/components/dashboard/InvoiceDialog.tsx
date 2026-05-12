import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Calendar, Clock, Eraser, Camera, X, ImagePlus } from "lucide-react";

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
  consumer_signature?: string | null;
  consumer_signature_at?: string | null;
  consumer_signature_name?: string | null;
  invoice_photos?: string[] | null;
  created_at: string;
  services?: { title: string } | null;
  business_profiles?: { business_name: string } | null;
  profiles?: { full_name: string | null; email: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: InvoiceBooking | null;
  /** Provider context: enables provider signature pad and photo upload */
  canSign?: boolean;
  /** Explicit viewer role; defaults to "business" if canSign, else "consumer" */
  viewerRole?: "business" | "consumer";
  onSigned?: () => void;
  onUpdated?: () => void;
}

const fmt = (n: number | null | undefined) => `$${(Number(n) || 0).toFixed(2)}`;

const SignaturePad = ({
  onChange,
}: {
  onChange: (hasDrawn: boolean, dataUrl: () => string | null) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDraw = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const moveDraw = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) {
      setHasDrawn(true);
      onChange(true, () => canvasRef.current?.toDataURL("image/png") || null);
    }
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
    onChange(false, () => null);
  };

  return (
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
      <Button type="button" variant="outline" size="sm" onClick={clearPad}>
        <Eraser className="w-4 h-4 mr-1.5" /> Clear
      </Button>
    </div>
  );
};

const InvoiceDialog = ({
  open,
  onOpenChange,
  booking,
  canSign,
  viewerRole,
  onSigned,
  onUpdated,
}: Props) => {
  const { toast } = useToast();
  const [signerName, setSignerName] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState<(() => string | null) | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const role: "business" | "consumer" = viewerRole || (canSign ? "business" : "consumer");

  // Convert stored entry (path or legacy public URL) into a storage path
  const toPath = (entry: string) => {
    const marker = "/invoice-photos/";
    const idx = entry.indexOf(marker);
    return idx > -1 ? entry.slice(idx + marker.length) : entry;
  };

  useEffect(() => {
    if (!open) {
      setHasDrawn(false);
      setSignerName("");
      setSigDataUrl(null);
      setSignedUrls({});
    }
    if (booking) {
      setPhotos(booking.invoice_photos || []);
    }
  }, [open, booking]);

  // Generate signed URLs whenever photo list changes
  useEffect(() => {
    if (!open || photos.length === 0) return;
    let cancelled = false;
    (async () => {
      const paths = photos.map(toPath);
      const { data, error } = await supabase.storage
        .from("invoice-photos")
        .createSignedUrls(paths, 60 * 60);
      if (cancelled || error || !data) return;
      const map: Record<string, string> = {};
      data.forEach((d, i) => {
        if (d.signedUrl) map[photos[i]] = d.signedUrl;
      });
      setSignedUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [photos, open]);

  if (!booking) return null;

  const total = Number(booking.total_price || 0);
  const platformFee = Number(booking.platform_fee || 0);
  const travelFee = Number(booking.travel_fee || 0);
  const subtotal = Math.max(0, total - platformFee - travelFee);
  const distance = booking.travel_distance_miles;

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: "Image too large", description: `${file.name} is over 10MB.`, variant: "destructive" });
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${booking.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("invoice-photos")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("invoice-photos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      const next = [...photos, ...uploaded];
      const { error } = await supabase
        .from("bookings")
        .update({ invoice_photos: next })
        .eq("id", booking.id);
      if (error) throw error;
      setPhotos(next);
      onUpdated?.();
      toast({ title: "Photos added", description: `${uploaded.length} photo(s) attached to invoice.` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async (url: string) => {
    try {
      const next = photos.filter((u) => u !== url);
      const { error } = await supabase
        .from("bookings")
        .update({ invoice_photos: next })
        .eq("id", booking.id);
      if (error) throw error;
      // Best-effort delete from storage
      try {
        const marker = "/invoice-photos/";
        const idx = url.indexOf(marker);
        if (idx > -1) {
          const path = url.slice(idx + marker.length);
          await supabase.storage.from("invoice-photos").remove([path]);
        }
      } catch {}
      setPhotos(next);
      onUpdated?.();
    } catch (e: any) {
      toast({ title: "Couldn't remove photo", description: e.message, variant: "destructive" });
    }
  };

  const saveSignature = async () => {
    if (!hasDrawn || !sigDataUrl) {
      toast({ title: "Please sign", description: "Draw your signature in the box.", variant: "destructive" });
      return;
    }
    if (!signerName.trim()) {
      toast({ title: "Printed name required", description: "Type your name to sign.", variant: "destructive" });
      return;
    }
    const dataUrl = sigDataUrl();
    if (!dataUrl) return;

    setSaving(true);
    try {
      const update =
        role === "business"
          ? {
              business_signature: dataUrl,
              business_signature_name: signerName.trim(),
              business_signature_at: new Date().toISOString(),
            }
          : {
              consumer_signature: dataUrl,
              consumer_signature_name: signerName.trim(),
              consumer_signature_at: new Date().toISOString(),
            };

      const { error } = await supabase.from("bookings").update(update).eq("id", booking.id);
      if (error) throw error;

      // Notify customer when provider signs
      if (role === "business" && booking.profiles?.email) {
        try {
          const signedAt = new Date();
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
                servicePrice: subtotal.toFixed(2),
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

      toast({
        title: role === "business" ? "Invoice signed" : "Invoice approved",
        description:
          role === "business"
            ? "Your signature has been saved."
            : "Thanks — your approval has been recorded.",
      });
      onSigned?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save signature", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const showProviderPad = role === "business" && !booking.business_signature;
  const showConsumerPad = role === "consumer" && !booking.consumer_signature;
  const showAnyPad = showProviderPad || showConsumerPad;

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

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Invoice photos
              </p>
              {role === "business" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 mr-1.5" />
                  )}
                  Add photos
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              hidden
              onChange={(e) => handleUploadPhotos(e.target.files)}
            />
            {photos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                {role === "business"
                  ? "Attach photos of work, parts, or receipts."
                  : "No photos attached yet."}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url) => (
                  <div key={url} className="relative group aspect-square">
                    <button
                      type="button"
                      onClick={() => setLightbox(url)}
                      className="block w-full h-full"
                    >
                      <img
                        src={url}
                        alt="Invoice attachment"
                        className="w-full h-full object-cover rounded-md border"
                      />
                    </button>
                    {role === "business" && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(url)}
                        className="absolute top-1 right-1 bg-background/90 border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Provider signature */}
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
            ) : showProviderPad ? (
              <SignaturePad
                onChange={(drawn, getter) => {
                  setHasDrawn(drawn);
                  setSigDataUrl(() => getter);
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">Not yet signed by provider</p>
            )}
          </div>

          {/* Consumer signature */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Customer Approval
            </p>
            {booking.consumer_signature ? (
              <div className="space-y-1">
                <img
                  src={booking.consumer_signature}
                  alt="Customer signature"
                  className="border rounded-md bg-background max-h-32"
                />
                <p className="text-xs text-muted-foreground">
                  Approved by {booking.consumer_signature_name} on{" "}
                  {booking.consumer_signature_at
                    ? new Date(booking.consumer_signature_at).toLocaleString()
                    : ""}
                </p>
              </div>
            ) : showConsumerPad ? (
              booking.business_signature ? (
                <SignaturePad
                  onChange={(drawn, getter) => {
                    setHasDrawn(drawn);
                    setSigDataUrl(() => getter);
                  }}
                />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Waiting on the provider to finalize and sign before you can approve.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground italic">Not yet approved by customer</p>
            )}
          </div>

          {showAnyPad && (showProviderPad || (showConsumerPad && booking.business_signature)) && (
            <Input
              placeholder="Printed name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          )}
        </div>

        <DialogFooter>
          {showAnyPad && (showProviderPad || (showConsumerPad && booking.business_signature)) ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Close
              </Button>
              <Button onClick={saveSignature} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {role === "business" ? "Sign & Save" : "Approve invoice"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {lightbox && (
        <Dialog open onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-3xl p-2">
            <img src={lightbox} alt="Invoice photo" className="w-full h-auto rounded-md" />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default InvoiceDialog;
