import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft } from "lucide-react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional: pre-select a conversation with a business
  businessId?: string;
  businessName?: string;
}

const ChatDialog = ({ open, onOpenChange, businessId, businessName }: ChatDialogProps) => {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  useEffect(() => {
    if (open && businessId && businessName && user) {
      // Auto-start or open conversation with this business
      openOrCreateConversation(businessId, businessName);
    }
  }, [open, businessId, businessName, user]);

  useEffect(() => {
    if (!open) {
      // Reset when dialog closes (but keep if businessId is set)
      if (!businessId) {
        setSelectedConversation(null);
      }
    }
  }, [open, businessId]);

  const openOrCreateConversation = async (busId: string, busName: string) => {
    if (!user) return;

    setCreatingConversation(true);
    try {
      // Check if conversation already exists
      const { data: existing, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .eq("consumer_id", user.id)
        .eq("business_id", busId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setSelectedConversation({ id: existing.id, name: busName });
      } else {
        // Create new conversation
        const { data: newConvo, error: createError } = await supabase
          .from("conversations")
          .insert({
            consumer_id: user.id,
            business_id: busId,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        setSelectedConversation({ id: newConvo.id, name: busName });
      }
    } catch (error) {
      console.error("Error opening conversation:", error);
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleSelectConversation = (conversationId: string, otherPartyName: string) => {
    setSelectedConversation({ id: conversationId, name: otherPartyName });
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] p-0 flex flex-col">
        <DialogHeader className="p-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {selectedConversation && !businessId && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <MessageSquare className="w-5 h-5" />
            {selectedConversation ? selectedConversation.name : "Messages"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {creatingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedConversation && user ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              otherPartyName={selectedConversation.name}
              currentUserId={user.id}
            />
          ) : (
            <ChatList
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
