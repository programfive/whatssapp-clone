-- Add group_settings column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS group_settings jsonb DEFAULT '{}'::jsonb;

-- Create RPC function to create a group conversation with settings
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_title text,
  p_member_ids uuid[],
  p_photo_url text DEFAULT NULL,
  p_group_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_me uuid;
  v_member_id uuid;
  v_disappearing text;
  v_message_body text;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the group conversation
  INSERT INTO public.conversations (is_group, title, photo_url, created_by, group_settings)
  VALUES (true, p_title, p_photo_url, v_me, p_group_settings)
  RETURNING id INTO v_conversation_id;

  -- Add the creator as a member
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conversation_id, v_me, 'admin');

  -- Add all other members
  FOREACH v_member_id IN ARRAY p_member_ids
  LOOP
    IF v_member_id != v_me THEN
      INSERT INTO public.conversation_members (conversation_id, user_id, role)
      VALUES (v_conversation_id, v_member_id, 'member');
    END IF;
  END LOOP;

  -- Check if disappearing messages are enabled and insert system message
  v_disappearing := p_group_settings->>'disappearing';
  IF v_disappearing IS NOT NULL AND v_disappearing != 'off' THEN
    v_message_body := format(
      'Activaste los mensajes temporales. Los mensajes nuevos desaparecerán de este chat después de %s.',
      CASE 
        WHEN v_disappearing = '24h' THEN '24 horas'
        WHEN v_disappearing = '7d' THEN '7 días'
        WHEN v_disappearing = '90d' THEN '90 días'
        ELSE v_disappearing
      END
    );
    
    INSERT INTO public.messages (conversation_id, sender_id, body, message_type)
    VALUES (v_conversation_id, v_me, v_message_body, 'system');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[], text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[], text, jsonb) TO authenticated;

-- Create RPC function to update conversation settings
CREATE OR REPLACE FUNCTION public.update_conversation_settings(
  p_conversation_id uuid,
  p_group_settings jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_old_disappearing text;
  v_new_disappearing text;
  v_message_body text;
  v_is_group boolean;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a member of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = v_me
  ) THEN
    RAISE EXCEPTION 'User is not a member of this conversation';
  END IF;

  -- Get current settings and conversation type
  SELECT group_settings->>'disappearing', is_group
  INTO v_old_disappearing, v_is_group
  FROM public.conversations
  WHERE id = p_conversation_id;

  -- Update the settings
  UPDATE public.conversations
  SET group_settings = p_group_settings
  WHERE id = p_conversation_id;

  -- Get new disappearing setting
  v_new_disappearing := p_group_settings->>'disappearing';

  -- Insert system message based on the change
  IF v_old_disappearing IS DISTINCT FROM v_new_disappearing THEN
    IF v_new_disappearing IS NULL OR v_new_disappearing = 'off' THEN
      v_message_body := 'Desactivaste los mensajes temporales';
    ELSE
      v_message_body := format(
        'Activaste los mensajes temporales. Los mensajes nuevos desaparecerán de este chat después de %s.',
        CASE 
          WHEN v_new_disappearing = '24h' THEN '24 horas'
          WHEN v_new_disappearing = '7d' THEN '7 días'
          WHEN v_new_disappearing = '90d' THEN '90 días'
          ELSE v_new_disappearing
        END
      );
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, body, message_type)
    VALUES (p_conversation_id, v_me, v_message_body, 'system');
  END IF;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.update_conversation_settings(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.update_conversation_settings(uuid, jsonb) TO authenticated;
