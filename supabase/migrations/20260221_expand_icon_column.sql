-- Expand icon column to TEXT to support custom icons (base64 data URLs)
ALTER TABLE public.categories ALTER COLUMN icon TYPE TEXT;
