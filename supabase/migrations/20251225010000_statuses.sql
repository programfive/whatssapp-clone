-- Create statuses table
CREATE TABLE IF NOT EXISTS public.statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create status_views table
CREATE TABLE IF NOT EXISTS public.status_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON public.statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON public.statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_status_views_status_id ON public.status_views(status_id);
CREATE INDEX IF NOT EXISTS idx_status_views_viewer_id ON public.status_views(viewer_id);

-- Enable Row Level Security
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for statuses table
-- Anyone can view statuses
CREATE POLICY "Anyone can view statuses"
  ON public.statuses
  FOR SELECT
  USING (true);

-- Users can insert their own statuses
CREATE POLICY "Users can insert their own statuses"
  ON public.statuses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own statuses
CREATE POLICY "Users can delete their own statuses"
  ON public.statuses
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for status_views table
-- Users can view all status views
CREATE POLICY "Users can view all status views"
  ON public.status_views
  FOR SELECT
  USING (true);

-- Users can insert their own status views
CREATE POLICY "Users can insert their own status views"
  ON public.status_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Users can update their own status views
CREATE POLICY "Users can update their own status views"
  ON public.status_views
  FOR UPDATE
  USING (auth.uid() = viewer_id);

-- Create storage bucket for media (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
-- Anyone can view media files
DROP POLICY IF EXISTS "Anyone can view media files" ON storage.objects;
CREATE POLICY "Anyone can view media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Authenticated users can upload their own media
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
CREATE POLICY "Users can upload their own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own media
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
CREATE POLICY "Users can delete their own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
