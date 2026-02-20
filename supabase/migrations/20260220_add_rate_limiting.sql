-- ============================================
-- Rate limiting & abuse prevention no banco
-- ============================================

-- 1. Limitar número máximo de links por usuário (500)
CREATE OR REPLACE FUNCTION check_links_limit()
RETURNS TRIGGER AS $$
DECLARE
  link_count INTEGER;
  max_links CONSTANT INTEGER := 500;
BEGIN
  SELECT COUNT(*) INTO link_count
  FROM public.links
  WHERE user_id = NEW.user_id;

  IF link_count >= max_links THEN
    RAISE EXCEPTION 'Limite de % links por usuário atingido', max_links;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_links_limit ON public.links;
CREATE TRIGGER enforce_links_limit
  BEFORE INSERT ON public.links
  FOR EACH ROW
  EXECUTE FUNCTION check_links_limit();

-- 2. Limitar número máximo de categorias por usuário (50)
CREATE OR REPLACE FUNCTION check_categories_limit()
RETURNS TRIGGER AS $$
DECLARE
  cat_count INTEGER;
  max_categories CONSTANT INTEGER := 50;
BEGIN
  SELECT COUNT(*) INTO cat_count
  FROM public.categories
  WHERE user_id = NEW.user_id;

  IF cat_count >= max_categories THEN
    RAISE EXCEPTION 'Limite de % categorias por usuário atingido', max_categories;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_categories_limit ON public.categories;
CREATE TRIGGER enforce_categories_limit
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION check_categories_limit();

-- 3. Limitar inserções rápidas (anti-spam): máx 10 links em 60 segundos
CREATE OR REPLACE FUNCTION check_links_insert_rate()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
  max_per_minute CONSTANT INTEGER := 10;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.links
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '60 seconds';

  IF recent_count >= max_per_minute THEN
    RAISE EXCEPTION 'Muitas inserções em pouco tempo. Aguarde um momento.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_links_insert_rate ON public.links;
CREATE TRIGGER enforce_links_insert_rate
  BEFORE INSERT ON public.links
  FOR EACH ROW
  EXECUTE FUNCTION check_links_insert_rate();

-- 4. Impedir URLs duplicadas por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_user_url_unique
  ON public.links(user_id, url);

-- 5. Índice para performance das queries de rate limiting
CREATE INDEX IF NOT EXISTS idx_links_user_created
  ON public.links(user_id, created_at DESC);
