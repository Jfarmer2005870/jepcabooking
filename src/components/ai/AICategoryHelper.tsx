import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CATEGORY_KEYWORDS: Record<string, string> = {
  cleaning: "cleaning",
  plumbing: "plumbing",
  electrical: "electrical",
  landscaping: "landscaping",
  painting: "painting",
  moving: "moving",
  handyman: "handyman",
  hvac: "hvac",
  pest_control: "pest_control",
};

const detectCategory = (text: string): string | null => {
  const lower = text.toLowerCase();
  for (const key of Object.keys(CATEGORY_KEYWORDS)) {
    const label = key.replace("_", " ");
    if (lower.includes(label)) return CATEGORY_KEYWORDS[key];
  }
  return null;
};

const AICategoryHelper = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! Tell me what you need help with at your home or business, and I'll point you to the right service.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { action: "category_helper", messages: newMessages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const reply: string = data?.result || "";
      setMessages([...newMessages, { role: "assistant", content: reply }]);

      const cat = detectCategory(reply);
      if (cat) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `[Browse ${cat.replace("_", " ")} services →](/services?category=${cat})`,
            },
          ]);
        }, 300);
      }
    } catch (e) {
      toast({
        title: "AI error",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg h-14 w-14 p-0"
          aria-label="Open AI helper"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl flex flex-col h-[480px] max-h-[calc(100vh-3rem)]">
          <div className="flex items-center justify-between p-3 border-b border-border bg-primary/5 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Find a service</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none [&>*]:my-0 [&_a]:text-primary [&_a]:underline">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              onClick={(e) => {
                                if (href?.startsWith("/")) {
                                  e.preventDefault();
                                  setOpen(false);
                                  navigate(href);
                                }
                              }}
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="e.g. My kitchen sink is leaking..."
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {!open && (
        <div className="fixed bottom-24 right-6 z-30 hidden md:flex items-center gap-1 bg-card border border-border shadow-md rounded-full px-3 py-1.5 text-xs text-muted-foreground pointer-events-none animate-fade-in">
          <MessageCircle className="w-3 h-3" />
          Ask AI which service you need
        </div>
      )}
    </>
  );
};

export default AICategoryHelper;
