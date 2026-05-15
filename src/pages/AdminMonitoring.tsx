import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert, Loader2 } from "lucide-react";
import { SmokeTestPanel } from "@/components/admin/SmokeTestPanel";

type Alert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  details: Record<string, unknown>;
  related_booking_id: string | null;
  related_event_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

const severityStyle: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-amber-500 text-white",
  info: "bg-muted text-foreground",
};

export default function AdminMonitoring() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState("open");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data && !error);
    })();
  }, [user, authLoading, navigate]);

  const loadAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monitoring_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Failed to load alerts", description: error.message, variant: "destructive" });
    } else {
      setAlerts((data ?? []) as Alert[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadAlerts();
  }, [isAdmin]);

  // Realtime updates
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("monitoring_alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "monitoring_alerts" }, () => loadAlerts())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin]);

  const runScan = async () => {
    setScanning(true);
    const { data, error } = await supabase.functions.invoke("monitoring-scan", { body: {} });
    setScanning(false);
    if (error) {
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    } else {
      const d = data as { detected?: { total?: number }; inserted?: number };
      toast({
        title: "Scan complete",
        description: `Detected ${d?.detected?.total ?? 0} issue(s) · ${d?.inserted ?? 0} new alert(s).`,
      });
      loadAlerts();
    }
  };

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("monitoring_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq("id", id);
    if (error) toast({ title: "Could not resolve", description: error.message, variant: "destructive" });
    else loadAlerts();
  };

  const filtered = useMemo(
    () => alerts.filter((a) => (tab === "open" ? !a.resolved : a.resolved)),
    [alerts, tab]
  );

  const counts = useMemo(() => {
    const open = alerts.filter((a) => !a.resolved);
    return {
      critical: open.filter((a) => a.severity === "critical").length,
      warning: open.filter((a) => a.severity === "warning").length,
      total: open.length,
    };
  }, [alerts]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="text-destructive" />
              Admins only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You need the <code>admin</code> role to view monitoring alerts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Post-launch monitoring</h1>
            <p className="text-muted-foreground text-sm">
              Failed payments, webhook errors, and booking inconsistencies. Scans run every 15 minutes.
            </p>
          </div>
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Run scan now
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Open alerts</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{counts.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Critical</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-destructive">{counts.critical}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Warning</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-amber-600">{counts.warning}</CardContent>
          </Card>
        </div>

        <SmokeTestPanel />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="open">Open ({alerts.filter((a) => !a.resolved).length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({alerts.filter((a) => a.resolved).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                  {tab === "open" ? "No open alerts. All systems healthy." : "No resolved alerts yet."}
                </CardContent>
              </Card>
            ) : (
              filtered.map((a) => (
                <Card key={a.id}>
                  <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 items-start min-w-0 flex-1">
                      <AlertTriangle
                        className={
                          a.severity === "critical"
                            ? "text-destructive shrink-0 mt-1"
                            : "text-amber-500 shrink-0 mt-1"
                        }
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{a.title}</span>
                          <Badge className={severityStyle[a.severity]}>{a.severity}</Badge>
                          <Badge variant="outline">{a.alert_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleString()}
                          {a.related_booking_id && ` · booking ${a.related_booking_id.slice(0, 8)}`}
                          {a.related_event_id && ` · event ${a.related_event_id}`}
                        </p>
                        <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto max-w-full">
                          {JSON.stringify(a.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                    {!a.resolved && (
                      <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>
                        Mark resolved
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
