-- Drop existing FK referencing auth.users if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_members_user_id_fkey') THEN
    ALTER TABLE public.conversation_members DROP CONSTRAINT conversation_members_user_id_fkey;
  END IF;
END $$;

-- Add new FK referencing public.profiles
-- This enables PostgREST to join on profiles
ALTER TABLE public.conversation_members
ADD CONSTRAINT conversation_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
