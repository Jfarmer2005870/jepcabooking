import { Check, FileCheck, Wrench, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "pending", label: "Requested", icon: FileCheck },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "in_progress", label: "In progress", icon: Wrench },
  { key: "completed", label: "Completed", icon: PartyPopper },
] as const;

const ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  in_progress: 2,
  completed: 3,
};

interface Props {
  status: string;
}

const BookingStatusTracker = ({ status }: Props) => {
  if (status === "cancelled") {
    return (
      <div className="rounded-lg bg-destructive/10 text-destructive text-sm font-medium px-3 py-2">
        Booking cancelled
      </div>
    );
  }

  const activeIndex = ORDER[status] ?? 0;

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const reached = i <= activeIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                    reached
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium text-center leading-tight",
                    reached ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 mb-5 rounded-full transition-colors",
                    i < activeIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingStatusTracker;
