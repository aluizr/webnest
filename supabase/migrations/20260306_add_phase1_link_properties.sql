-- Phase 1 (Notion-like): status, priority, due date
-- Adds lightweight task-style properties to links.

ALTER TABLE public.links
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'backlog',
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS due_date DATE NULL;

ALTER TABLE public.links
DROP CONSTRAINT IF EXISTS links_status_check;

ALTER TABLE public.links
ADD CONSTRAINT links_status_check
CHECK (status IN ('backlog', 'in_progress', 'done'));

ALTER TABLE public.links
DROP CONSTRAINT IF EXISTS links_priority_check;

ALTER TABLE public.links
ADD CONSTRAINT links_priority_check
CHECK (priority IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS idx_links_due_date ON public.links(due_date);
CREATE INDEX IF NOT EXISTS idx_links_status ON public.links(status);
CREATE INDEX IF NOT EXISTS idx_links_priority ON public.links(priority);

-- Recreate FTS helpers so new properties can be searched and returned by RPC.
CREATE OR REPLACE FUNCTION public.links_search_vector_update()
RETURNS trigger AS $$
BEGIN
	NEW.search_vector :=
		setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
		setweight(to_tsvector('portuguese', coalesce(NEW.url, '')), 'B') ||
		setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'B') ||
		setweight(to_tsvector('portuguese', coalesce(NEW.category, '')), 'C') ||
		setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'C') ||
		setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C') ||
		setweight(to_tsvector('portuguese', coalesce(NEW.status, '')), 'D') ||
		setweight(to_tsvector('portuguese', coalesce(NEW.priority, '')), 'D');
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.search_links(
	search_query TEXT,
	user_id_param UUID
)
RETURNS TABLE (
	id UUID,
	url TEXT,
	title TEXT,
	description TEXT,
	category TEXT,
	tags TEXT[],
	is_favorite BOOLEAN,
	favicon TEXT,
	og_image TEXT,
	notes TEXT,
	status TEXT,
	priority TEXT,
	due_date DATE,
	created_at TIMESTAMPTZ,
	"position" INTEGER,
	rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	tsquery_val tsquery;
BEGIN
	tsquery_val := plainto_tsquery('portuguese', search_query);

	RETURN QUERY
	SELECT
		l.id,
		l.url,
		l.title,
		l.description,
		l.category,
		l.tags,
		l.is_favorite,
		l.favicon,
		l.og_image,
		l.notes,
		l.status,
		l.priority,
		l.due_date,
		l.created_at,
		l."position",
		ts_rank_cd(l.search_vector, tsquery_val) AS rank
	FROM public.links l
	WHERE l.user_id = user_id_param
		AND l.search_vector @@ tsquery_val
	ORDER BY rank DESC;
END;
$$;

UPDATE public.links SET search_vector =
	setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
	setweight(to_tsvector('portuguese', coalesce(url, '')), 'B') ||
	setweight(to_tsvector('portuguese', coalesce(description, '')), 'B') ||
	setweight(to_tsvector('portuguese', coalesce(category, '')), 'C') ||
	setweight(to_tsvector('portuguese', coalesce(notes, '')), 'C') ||
	setweight(to_tsvector('portuguese', coalesce(array_to_string(tags, ' '), '')), 'C') ||
	setweight(to_tsvector('portuguese', coalesce(status, '')), 'D') ||
	setweight(to_tsvector('portuguese', coalesce(priority, '')), 'D');
