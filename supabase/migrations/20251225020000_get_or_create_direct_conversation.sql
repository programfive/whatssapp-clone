-- Function to get or create a direct conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  p_other_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_conversation_id uuid;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to find existing direct conversation between these two users
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm1
      WHERE cm1.conversation_id = c.id AND cm1.user_id = v_me
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm2
      WHERE cm2.conversation_id = c.id AND cm2.user_id = p_other_user_id
    )
    AND (
      SELECT COUNT(*) FROM public.conversation_members cm3
      WHERE cm3.conversation_id = c.id
    ) = 2
  LIMIT 1;

  -- If no conversation exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (is_group, title, created_by)
    VALUES (false, NULL, v_me)
    RETURNING id INTO v_conversation_id;

    -- Add both users as members
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES 
      (v_conversation_id, v_me, 'member'),
      (v_conversation_id, p_other_user_id, 'member');
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;
