import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  consumer_id: string;
  business_id: string;
  updated_at: string;
  other_party_name: string;
  last_message?: string;
  unread_count: number;
}

interface ChatListProps {
  onSelectConversation: (conversationId: string, otherPartyName: string) => void;
  selectedConversationId?: string;
}

const ChatList = ({ onSelectConversation, selectedConversationId }: ChatListProps) => {
  const { user, userRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, userRole]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      const { data: convos, error } = await query;
      if (error) throw error;

      // Fetch additional data for each conversation
      const conversationsWithDetails = await Promise.all(
        (convos || []).map(async (convo) => {
          // Get other party name
          let otherPartyName = "";
          
          if (userRole === "consumer") {
            // Consumer sees business name
            const { data: business } = await supabase
              .from("business_profiles")
              .select("business_name")
              .eq("id", convo.business_id)
              .maybeSingle();
            otherPartyName = business?.business_name || "Business";
          } else {
            // Business sees consumer name
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", convo.consumer_id)
              .maybeSingle();
            otherPartyName = profile?.full_name || profile?.email || "Customer";
          }

          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", convo.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", convo.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          return {
            ...convo,
            other_party_name: otherPartyName,
            last_message: lastMsg?.content,
            unread_count: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-foreground mb-1">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          {userRole === "consumer"
            ? "Start a conversation by messaging a business from their service page"
            : "Conversations with customers will appear here"}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {conversations.map((convo) => (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo.id, convo.other_party_name)}
            className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
              selectedConversationId === convo.id ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate">
                    {convo.other_party_name}
                  </h4>
                  {convo.unread_count > 0 && (
                    <Badge variant="default" className="text-xs">
                      {convo.unread_count}
                    </Badge>
                  )}
                </div>
                {convo.last_message && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {convo.last_message}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
              </span>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ChatList;