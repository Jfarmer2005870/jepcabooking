import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// 30-min slots from 8:00 to 18:00
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h < 18; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  out.push("18:00");
  return out;
})();

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentDate: string | null;
  currentTime: string | null;
  onRescheduled?: () => void;
}

const RescheduleBookingDialog = ({
  open,
  onOpenChange,
  bookingId,
  currentDate,
  currentTime,
  onRescheduled,
}: Props) => {
  const [date, setDate] = useState<Date | undefined>(
    currentDate ? new Date(`${currentDate}T00:00:00`) : undefined
  );
  const [time, setTime] = useState<string>(
    currentTime ? currentTime.slice(0, 5) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date || !time) {
      toast({
        title: "Pick a date and time",
        description: "Both fields are required to reschedule.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const isoDate = format(date, "yyyy-MM-dd");
      const { error } = await supabase
        .from("bookings")
        .update({ scheduled_date: isoDate, scheduled_time: time })
        .eq("id", bookingId);
      if (error) throw error;
      toast({
        title: "Booking rescheduled",
        description: `Now set for ${format(date, "PPP")} at ${time}.`,
      });
      onRescheduled?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Couldn't reschedule",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule booking</DialogTitle>
          <DialogDescription>
            Pick a new date and 30-minute slot. The provider will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Time slot</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleBookingDialog;
