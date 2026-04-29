import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success || data.reason === "already_unsubscribed") setState("done");
      else {
        setErrorMsg(data.error || "Something went wrong");
        setState("error");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <Card className="w-full max-w-md shadow-strong">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl text-primary">Jepca</CardTitle>
          <CardDescription>Email preferences</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking your link…</p>
            </div>
          )}
          {state === "valid" && (
            <>
              <p className="text-foreground">Are you sure you want to unsubscribe from Jepca app emails?</p>
              <p className="text-sm text-muted-foreground">You'll stop receiving booking updates and notifications.</p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Updating preferences…</p>
            </div>
          )}
          {(state === "done" || state === "already") && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-foreground font-medium">
                {state === "already" ? "You're already unsubscribed." : "You've been unsubscribed."}
              </p>
              <Button asChild variant="outline"><Link to="/">Back to Jepca</Link></Button>
            </div>
          )}
          {(state === "invalid" || state === "error") && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-foreground font-medium">
                {state === "error" ? errorMsg || "Something went wrong" : "This link is invalid or has expired."}
              </p>
              <Button asChild variant="outline"><Link to="/">Back to Jepca</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
