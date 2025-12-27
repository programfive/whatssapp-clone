-- Migration to enforce dynamic metadata for 1:1 chats
-- 1. Update all existing 1:1 chats to have NULL title and photo_url
UPDATE public.conversations
SET title = NULL, photo_url = NULL
WHERE is_group = FALSE;

-- 2. Ensure create_direct_conversation ignores p_title (or we rely on the caller passing NULL, which we fixed, 
--    but updating the RPC is safer to enforce it at DB level too).
CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  p_other_user_id uuid,
  p_title text default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_me uuid;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify other user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if conversation already exists
  SELECT cm1.conversation_id INTO v_conversation_id
  FROM public.conversation_members cm1
  JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
  JOIN public.conversations c ON cm1.conversation_id = c.id
  WHERE cm1.user_id = v_me 
    AND cm2.user_id = p_other_user_id
    AND c.is_group = FALSE
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Force title to be NULL for direct chats so we can dynamically resolve names
  INSERT INTO public.conversations (is_group, title, created_by)
  VALUES (FALSE, NULL, v_me)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES
    (v_conversation_id, v_me, 'member'),
    (v_conversation_id, p_other_user_id, 'member');

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, text) TO authenticated;
