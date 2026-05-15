import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlayCircle, Camera, Download, CheckCircle2, XCircle } from "lucide-react";
import html2canvas from "html2canvas";

type Step = { name: string; ok: boolean; detail?: string; ms: number };
type LogEntry = { level: string; ts: string; msg: string };
type WebhookEvent = {
  event_id: string;
  event_type: string;
  processing_status: string;
  signature_verified: boolean;
  payment_intent_id: string | null;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
};
type RunResult = {
  ok: boolean;
  summary?: string;
  error?: string;
  bookingId?: string;
  steps: Step[];
  logs: LogEntry[];
  webhook_events?: WebhookEvent[];
  ranAt: string;
};

const ROUTES_TO_CAPTURE: { label: string; path: string }[] = [
  { label: "Marketplace", path: "/marketplace" },
  { label: "Consumer dashboard", path: "/dashboard/consumer" },
  { label: "Provider dashboard", path: "/dashboard/business" },
];

export function SmokeTestPanel() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [shots, setShots] = useState<{ label: string; path: string; dataUrl: string }[]>([]);
  const captureHostRef = useRef<HTMLDivElement | null>(null);

  const captureRoute = async (label: string, path: string) => {
    if (!captureHostRef.current) return null;
    const iframe = document.createElement("iframe");
    iframe.src = path;
    iframe.style.width = "1280px";
    iframe.style.height = "800px";
    iframe.style.border = "0";
    iframe.style.background = "white";
    captureHostRef.current.innerHTML = "";
    captureHostRef.current.appendChild(iframe);

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      iframe.addEventListener("load", () => setTimeout(done, 1500), { once: true });
      setTimeout(done, 6000); // hard cap
    });

    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) return null;
      const canvas = await html2canvas(doc.body, {
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 1280,
        height: 800,
        windowWidth: 1280,
        windowHeight: 800,
        logging: false,
      });
      return { label, path, dataUrl: canvas.toDataURL("image/png") };
    } catch (e) {
      console.error(`Capture failed for ${path}:`, e);
      return null;
    } finally {
      captureHostRef.current.innerHTML = "";
    }
  };

  const runSmokeTest = async () => {
    setRunning(true);
    setResult(null);
    setShots([]);
    try {
      // 1. Run scripted backend flow
      setPhase("Running scripted flow (book → pay → reschedule → sign invoice → review)…");
      const { data, error } = await supabase.functions.invoke("consumer-flow-tests", { body: {} });
      if (error) throw new Error(error.message || "Edge function error");
      const r = data as RunResult;
      setResult(r);

      // 2. Capture screenshots of key consumer-facing routes
      setPhase("Capturing screenshots…");
      const captured: { label: string; path: string; dataUrl: string }[] = [];
      for (const r2 of ROUTES_TO_CAPTURE) {
        const shot = await captureRoute(r2.label, r2.path);
        if (shot) {
          captured.push(shot);
          setShots([...captured]);
        }
      }

      toast({
        title: r.ok ? "Smoke test passed" : "Smoke test failed",
        description: r.summary || r.error || "See report below.",
        variant: r.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Smoke test errored", description: e.message, variant: "destructive" });
    } finally {
      setPhase("");
      setRunning(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const report = {
      generatedAt: new Date().toISOString(),
      run: result,
      screenshots: shots.map((s) => ({ label: s.label, path: s.path, dataUrl: s.dataUrl })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smoke-test-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            One-click E2E smoke test
          </span>
          <div className="flex gap-2">
            {result && (
              <Button size="sm" variant="outline" onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download report
              </Button>
            )}
            <Button size="sm" onClick={runSmokeTest} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {running ? "Running…" : "Run smoke test"}
            </Button>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Provisions ephemeral users, drives book → pay → reschedule → sign invoice → leave review
          server-side, then captures consumer-facing screenshots. All test data is torn down automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {phase}
          </div>
        )}

        {result && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {result.ok ? (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Passed
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" /> Failed
                </Badge>
              )}
              <span className="text-sm font-medium">{result.summary || result.error}</span>
              <span className="text-xs text-muted-foreground">
                run at {new Date(result.ranAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Steps */}
            <div className="border rounded-md divide-y">
              {result.steps.map((s, i) => (
                <div key={i} className="px-3 py-2 flex items-start gap-2 text-sm">
                  {s.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.ms}ms</span>
                    </div>
                    {s.detail && (
                      <pre className="text-xs text-destructive mt-1 whitespace-pre-wrap break-all">{s.detail}</pre>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Webhook events */}
            {result.webhook_events && result.webhook_events.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  Stripe webhook events for this run
                </div>
                <div className="border rounded-md divide-y text-xs">
                  {result.webhook_events.map((e) => (
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
                      {e.payment_intent_id && (
                        <span className="font-mono text-muted-foreground">{e.payment_intent_id}</span>
                      )}
                      <span className="text-muted-foreground ml-auto">
                        sig {e.signature_verified ? "✓" : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logs */}
            {result.logs && result.logs.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Edge function log</div>
                <pre className="text-xs bg-muted/50 rounded p-2 max-h-64 overflow-auto whitespace-pre-wrap">
                  {result.logs
                    .map((l) => `[${l.ts.slice(11, 19)}] ${l.level.toUpperCase().padEnd(5)} ${l.msg}`)
                    .join("\n")}
                </pre>
              </div>
            )}

            {/* Screenshots */}
            {shots.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Screenshots
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shots.map((s) => (
                    <div key={s.path} className="border rounded-md overflow-hidden">
                      <div className="px-3 py-1.5 text-xs flex items-center justify-between bg-muted/40">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-muted-foreground font-mono">{s.path}</span>
                      </div>
                      <img src={s.dataUrl} alt={s.label} className="w-full h-auto block" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Hidden host for capturing iframes */}
      <div
        ref={captureHostRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "1280px",
          height: "800px",
          pointerEvents: "none",
          opacity: 0,
        }}
        aria-hidden="true"
      />
    </Card>
  );
}
