import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AISummarizeNotesProps {
  notes: string;
}

const AISummarizeNotes = ({ notes }: AISummarizeNotesProps) => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!notes || notes.length < 80) return null;

  const summarize = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { action: "summarize_notes", payload: { notes } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data?.result || "");
    } catch (e) {
      toast({
        title: "AI error",
        description: e instanceof Error ? e.message : "Could not summarize",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      {summary ? (
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-medium">AI summary:</span> {summary}
          </p>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={loading}
          onClick={summarize}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3 mr-1" />
          )}
          Summarize with AI
        </Button>
      )}
    </div>
  );
};

export default AISummarizeNotes;
