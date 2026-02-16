-- Add icon field to categories table
ALTER TABLE public.categories ADD COLUMN icon VARCHAR(50) DEFAULT 'Folder';

-- Add constraint for icon name length
ALTER TABLE public.categories
  ADD CONSTRAINT categories_icon_max_length CHECK (char_length(icon) <= 50);

-- Create index for better query performance
CREATE INDEX idx_categories_icon ON public.categories(icon);

-- Comment for documentation
COMMENT ON COLUMN public.categories.icon IS 'Lucide React icon name (e.g., Folder, BookOpen, Code, etc.)';
