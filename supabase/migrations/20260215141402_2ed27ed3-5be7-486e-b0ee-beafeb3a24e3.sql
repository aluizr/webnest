
-- 1. Add user_id to links
ALTER TABLE public.links ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id to categories
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add database constraints for input validation
ALTER TABLE public.links
  ADD CONSTRAINT links_url_max_length CHECK (char_length(url) <= 2048),
  ADD CONSTRAINT links_title_max_length CHECK (char_length(title) <= 255),
  ADD CONSTRAINT links_description_max_length CHECK (char_length(description) <= 1000),
  ADD CONSTRAINT links_category_max_length CHECK (char_length(category) <= 100),
  ADD CONSTRAINT links_tags_max_count CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_name_max_length CHECK (char_length(name) <= 100);

-- 4. Drop old permissive policies
DROP POLICY IF EXISTS "Allow all access to links" ON public.links;
DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;

-- 5. New RLS policies for links (user-scoped)
CREATE POLICY "Users can view their own links"
  ON public.links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links"
  ON public.links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
  ON public.links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON public.links FOR DELETE
  USING (auth.uid() = user_id);

-- 6. New RLS policies for categories (user-scoped)
CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);
