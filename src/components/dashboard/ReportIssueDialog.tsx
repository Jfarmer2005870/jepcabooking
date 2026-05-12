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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const reportSchema = z.object({
  reason: z.string().trim().min(10, "Please describe the issue (at least 10 characters)").max(1000),
});

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  serviceName: string;
  onReported?: () => void;
}

const ReportIssueDialog = ({ open, onOpenChange, bookingId, serviceName, onReported }: ReportIssueDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsed = reportSchema.safeParse({ reason });
    if (!parsed.success) {
      toast({ title: "Invalid", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        dispute_status: "open",
        dispute_reason: parsed.data.reason,
        dispute_opened_at: new Date().toISOString(),
      })
      .eq("id", bookingId);
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't submit report", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Report submitted",
      description: "The provider has been notified and will review your issue.",
    });
    setReason("");
    onReported?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Report an issue
          </DialogTitle>
          <DialogDescription>
            Tell us what went wrong with "{serviceName}". The provider will be notified and can issue a refund if appropriate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">What happened?</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue in detail…"
            rows={5}
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueDialog;
