-- Adicionar campo og_image para armazenar a imagem Open Graph dos links
ALTER TABLE links ADD COLUMN IF NOT EXISTS og_image TEXT DEFAULT '';
