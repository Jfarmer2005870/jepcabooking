-- Create conversations table to track chats between consumers and businesses
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(consumer_id, business_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Consumers can view their conversations"
ON public.conversations FOR SELECT
USING (consumer_id = auth.uid());

CREATE POLICY "Business owners can view their conversations"
ON public.conversations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.business_profiles bp
  WHERE bp.id = conversations.business_id AND bp.user_id = auth.uid()
));

CREATE POLICY "Consumers can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (consumer_id = auth.uid());

-- RLS policies for messages
CREATE POLICY "Conversation participants can view messages"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id
  AND (c.consumer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = c.business_id AND bp.user_id = auth.uid()
  ))
));

CREATE POLICY "Conversation participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.consumer_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = c.business_id AND bp.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can mark their received messages as read"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.consumer_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = c.business_id AND bp.user_id = auth.uid()
    ))
  )
  AND sender_id != auth.uid()
);

-- Trigger to update conversation updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;