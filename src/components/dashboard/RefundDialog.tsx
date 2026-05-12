import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const refundSchema = z.object({
  amount: z.coerce.number().positive("Amount must be > 0"),
  note: z.string().trim().max(500).optional(),
});

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  totalPrice: number;
  alreadyRefunded: number;
  disputeReason?: string | null;
  onRefunded?: () => void;
}

const RefundDialog = ({ open, onOpenChange, bookingId, totalPrice, alreadyRefunded, disputeReason, onRefunded }: RefundDialogProps) => {
  const remaining = Math.max(0, Number(totalPrice || 0) - Number(alreadyRefunded || 0));
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRefund = async () => {
    const parsed = refundSchema.safeParse({ amount, note });
    if (!parsed.success) {
      toast({ title: "Invalid", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (parsed.data.amount > remaining + 0.001) {
      toast({ title: "Too high", description: `Max refundable: $${remaining.toFixed(2)}`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("refund-booking", {
      body: { booking_id: bookingId, amount: parsed.data.amount, reason: parsed.data.note },
    });
    setSubmitting(false);
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error || error?.message || "Refund failed";
      toast({ title: "Refund failed", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Refund issued", description: `$${parsed.data.amount.toFixed(2)} refunded to the customer.` });
    onRefunded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue refund</DialogTitle>
          <DialogDescription>
            Refund the customer via Stripe. Max refundable: ${remaining.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        {disputeReason && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium mb-1">Customer reported:</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{disputeReason}</p>
          </div>
        )}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="amount">Refund amount ($)</Label>
            <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Internal note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleRefund} disabled={submitting || remaining <= 0}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Issue refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;
