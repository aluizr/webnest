
-- Links table
CREATE TABLE public.links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  favicon TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public access policies (personal app, no auth)
CREATE POLICY "Allow all access to links" ON public.links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Insert default categories
INSERT INTO public.categories (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Trabalho'),
  ('00000000-0000-0000-0000-000000000002', 'Estudos'),
  ('00000000-0000-0000-0000-000000000003', 'Lazer');
