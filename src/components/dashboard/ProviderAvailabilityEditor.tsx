import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Window {
  weekday: number;
  start_time: string;
  end_time: string;
}

interface Props {
  businessId: string;
}

const ProviderAvailabilityEditor = ({ businessId }: Props) => {
  const [enabled, setEnabled] = useState<boolean[]>(Array(7).fill(false));
  const [starts, setStarts] = useState<string[]>(Array(7).fill("09:00"));
  const [ends, setEnds] = useState<string[]>(Array(7).fill("17:00"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const { data } = await supabase
        .from("provider_availability")
        .select("weekday, start_time, end_time")
        .eq("business_id", businessId);
      const en = Array(7).fill(false);
      const s = Array(7).fill("09:00");
      const e = Array(7).fill("17:00");
      (data as Window[] | null)?.forEach((w) => {
        en[w.weekday] = true;
        s[w.weekday] = w.start_time.slice(0, 5);
        e[w.weekday] = w.end_time.slice(0, 5);
      });
      setEnabled(en);
      setStarts(s);
      setEnds(e);
      setLoading(false);
    })();
  }, [businessId]);

  const save = async () => {
    setSaving(true);
    // Validate
    for (let i = 0; i < 7; i++) {
      if (enabled[i] && starts[i] >= ends[i]) {
        toast({ title: "Invalid range", description: `${DAYS[i]}: end time must be after start time`, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    // Replace strategy: delete existing then insert active rows
    const { error: delErr } = await supabase.from("provider_availability").delete().eq("business_id", businessId);
    if (delErr) {
      toast({ title: "Save failed", description: delErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    const rows = enabled
      .map((on, i) => on ? { business_id: businessId, weekday: i, start_time: starts[i], end_time: ends[i] } : null)
      .filter((r): r is { business_id: string; weekday: number; start_time: string; end_time: string } => r !== null);
    if (rows.length > 0) {
      const { error } = await supabase.from("provider_availability").insert(rows);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    toast({ title: "Availability saved" });
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Working hours
        </CardTitle>
        <CardDescription>Customers can only book within these windows. Leave a day off to mark it closed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAYS.map((day, i) => (
          <div key={day} className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 w-24">
              <Switch
                checked={enabled[i]}
                onCheckedChange={(v) => setEnabled((arr) => arr.map((x, j) => j === i ? v : x))}
              />
              <Label className="text-sm font-medium">{day}</Label>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="time"
                value={starts[i]}
                disabled={!enabled[i]}
                onChange={(e) => setStarts((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                className="w-32"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={ends[i]}
                disabled={!enabled[i]}
                onChange={(e) => setEnds((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                className="w-32"
              />
            </div>
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="mt-2">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save hours
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProviderAvailabilityEditor;
