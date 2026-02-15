import { z } from "zod";

export const linkSchema = z.object({
  url: z.string().url("URL inválida").max(2048, "URL muito longa").refine(
    (url) => /^https?:\/\//i.test(url),
    "Apenas URLs http/https são permitidas"
  ),
  title: z.string().max(255, "Título muito longo"),
  description: z.string().max(1000, "Descrição muito longa"),
  category: z.string().max(100, "Categoria muito longa"),
  tags: z.array(z.string().max(30, "Tag muito longa")).max(20, "Máximo de 20 tags"),
  isFavorite: z.boolean(),
  favicon: z.string().max(2048).optional().default(""),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100, "Nome muito longo"),
});

export type LinkInput = z.infer<typeof linkSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
