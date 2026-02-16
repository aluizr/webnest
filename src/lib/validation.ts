import { z } from "zod";

// ✅ Lista branca de protocolos permitidos
const ALLOWED_PROTOCOLS = [
  'http://',
  'https://',
  'ftp://',
  'ftps://',
  'mailto:',
];

// ✅ Lista negra de padrões maliciosos
const MALICIOUS_PATTERNS = [
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
  /file:/i,
  /about:/i,
  /blob:/i,
  /view-source:/i,
];

// Validador customizado para URLs seguras
const validateSafeUrl = (url: string): boolean => {
  try {
    const hasAllowedProtocol = ALLOWED_PROTOCOLS.some(
      proto => url.toLowerCase().startsWith(proto)
    );

    if (!hasAllowedProtocol) {
      return false;
    }

    const hasMaliciousPattern = MALICIOUS_PATTERNS.some(
      pattern => pattern.test(url)
    );

    if (hasMaliciousPattern) {
      return false;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url);
    }

    return true;
  } catch {
    return false;
  }
};

export const linkSchema = z.object({
  url: z
    .string()
    .min(1, "URL é obrigatória")
    .max(2048, "URL muito longa")
    .refine(validateSafeUrl, "URL inválida ou protocolo não permitido")
    .transform(url => url.trim()),
  title: z.string().max(255, "Título muito longo").transform(title => title.trim()),
  description: z.string().max(1000, "Descrição muito longa").transform(desc => desc.trim()),
  category: z.string().max(100, "Categoria muito longa").transform(cat => cat.trim()),
  tags: z
    .array(
      z
        .string()
        .max(30, "Tag muito longa")
        .transform(tag => tag.trim().toLowerCase())
    )
    .max(20, "Máximo de 20 tags")
    .refine(
      tags => tags.length === new Set(tags).size,
      "Tags duplicadas não permitidas"
    ),
  isFavorite: z.boolean(),
  favicon: z
    .string()
    .max(2048, "Favicon URL muito longa")
    .optional()
    .default("")
    .refine(
      favicon => !favicon || favicon.startsWith('http'),
      "Favicon deve ser uma URL válida"
    ),
});

// ✅ Lista de ícones Lucide suportados para categorias
const ALLOWED_ICONS = [
  'Folder', 'BookOpen', 'Code', 'Palette', 'Music', 'Video', 'Image',
  'Newspaper', 'Briefcase', 'Heart', 'Star', 'Shield', 'Settings', 'Layout',
  'Lightbulb', 'Zap', 'Trending', 'Shopping', 'Archive', 'Tag',
  'Globe', 'Database', 'Cloud', 'Cpu', 'Award', 'Radio', 'Gamepad2'
];

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nome obrigatório")
    .max(100, "Nome muito longo")
    .transform(name => name.trim())
    .refine(
      name => !/[<>'"]/i.test(name),
      "Caracteres especiais não permitidos no nome"
    ),
  icon: z
    .string()
    .max(50, "Nome do ícone muito longo")
    .default("Folder")
    .refine(
      icon => ALLOWED_ICONS.includes(icon),
      `Ícone inválido. Permitidos: ${ALLOWED_ICONS.join(", ")}`
    ),
  parentId: z.string().uuid().optional().nullable(),
});

export type LinkInput = z.infer<typeof linkSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
