-- =============================================
-- Migration: Soft Delete (Lixeira)
-- Adds deleted_at column for soft deletion
-- =============================================

-- Add deleted_at column (null = active, timestamp = in trash)
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of active vs deleted links
CREATE INDEX IF NOT EXISTS idx_links_deleted_at ON public.links (deleted_at) WHERE deleted_at IS NULL;

-- Auto-purge links deleted more than 30 days ago (optional — run via cron/scheduled function)
-- This is just the function; scheduling must be done via Supabase Edge Functions or pg_cron
CREATE OR REPLACE FUNCTION public.purge_old_deleted_links()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.links
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
