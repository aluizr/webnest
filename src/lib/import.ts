import type { LinkItem } from "@/types/link";
import { linkSchema } from "@/lib/validation";
import { ZodError } from "zod";

interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; error: string }>;
  links: Omit<LinkItem, "id" | "createdAt" | "position">[];
}

/**
 * Parse CSV content and extract links
 */
export function parseCSV(content: string): ImportResult {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { successCount: 0, errorCount: 0, errors: [], links: [] };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  
  const links: Omit<LinkItem, "id" | "createdAt" | "position">[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  // Find column indices (flexible for different CSV formats)
  const titleIdx = headers.findIndex(h => h.includes('title'));
  const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link'));
  const categoryIdx = headers.findIndex(h => h.includes('category'));
  const tagsIdx = headers.findIndex(h => h.includes('tags') || h.includes('tag'));
  const favoriteIdx = headers.findIndex(h => h.includes('favorite') || h.includes('fav'));
  const descriptionIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'));

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Simple CSV parser handling quoted fields
      const fields = parseCSVLine(line);
      
      const title = fields[titleIdx]?.trim() || '';
      const url = fields[urlIdx]?.trim() || '';
      const category = fields[categoryIdx]?.trim() || undefined;
      const tagsStr = fields[tagsIdx]?.trim() || '';
      const favoriteStr = fields[favoriteIdx]?.trim().toLowerCase() || 'no';
      const description = fields[descriptionIdx]?.trim() || undefined;

      const tags = tagsStr
        ? tagsStr.split(';').map(t => t.trim()).filter(Boolean)
        : [];
      const isFavorite = favoriteStr === 'yes' || favoriteStr === 'true' || favoriteStr === '1';

      // Create linkItem and validate with Zod
      const linkData = {
        title,
        url,
        category: category || '',
        tags,
        description,
        isFavorite,
        favicon: '',
      };

      // Validate using linkSchema
      const validated = linkSchema.parse(linkData);
      links.push(validated);
    } catch (err) {
      const errorMsg = err instanceof ZodError 
        ? err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
        : err instanceof Error ? err.message : 'Unknown error';
      errors.push({ row: i + 1, error: errorMsg });
    }
  }

  return {
    successCount: links.length,
    errorCount: errors.length,
    errors,
    links,
  };
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse HTML table and extract links
 * Expects table structure: th with headers, then tr/td rows
 */
export function parseHTML(content: string): ImportResult {
  const parser = new DOMParser();
  let doc: Document;

  try {
    doc = parser.parseFromString(content, 'text/html');
  } catch {
    return { successCount: 0, errorCount: 0, errors: [{ row: 0, error: 'Inválido HTML' }], links: [] };
  }

  const table = doc.querySelector('table');
  if (!table) {
    return { successCount: 0, errorCount: 0, errors: [{ row: 0, error: 'Nenhuma tabela encontrada' }], links: [] };
  }

  const headerRow = table.querySelector('thead tr');
  if (!headerRow) {
    return { successCount: 0, errorCount: 0, errors: [{ row: 0, error: 'Nenhum header encontrado' }], links: [] };
  }

  const headers = Array.from(headerRow.querySelectorAll('th')).map(th =>
    th.textContent?.trim().toLowerCase() || ''
  );

  const titleIdx = headers.findIndex(h => h.includes('title'));
  const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link'));
  const categoryIdx = headers.findIndex(h => h.includes('category'));
  const tagsIdx = headers.findIndex(h => h.includes('tags') || h.includes('tag'));
  const favoriteIdx = headers.findIndex(h => h.includes('fav'));
  const descriptionIdx = headers.findIndex(h => h.includes('description'));

  const links: Omit<LinkItem, "id" | "createdAt" | "position">[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach((row, rowIdx) => {
    try {
      const cells = Array.from(row.querySelectorAll('td'));
      const texts = cells.map(td => td.textContent?.trim() || '');

      const title = texts[titleIdx]?.trim() || '';
      let url = texts[urlIdx]?.trim() || '';
      
      // If URL column contains a link, extract href
      const link = cells[urlIdx]?.querySelector('a');
      if (link?.href) {
        url = link.href;
      }

      const category = texts[categoryIdx]?.trim() || undefined;
      const tagsStr = texts[tagsIdx]?.trim() || '';
      const favoriteStr = texts[favoriteIdx]?.trim().toLowerCase() || 'no';
      const description = texts[descriptionIdx]?.trim() || undefined;

      const tags = tagsStr
        ? tagsStr.split(';').map(t => t.trim()).filter(Boolean)
        : [];
      const isFavorite = favoriteStr === '★' || favoriteStr === 'yes' || favoriteStr === 'true';

      const linkData = {
        title,
        url,
        category: category || '',
        tags,
        description,
        isFavorite,
        favicon: '',
      };

      const validated = linkSchema.parse(linkData);
      links.push(validated);
    } catch (err) {
      const errorMsg = err instanceof ZodError 
        ? err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
        : err instanceof Error ? err.message : 'Unknown error';
      errors.push({ row: rowIdx + 2, error: errorMsg });
    }
  });

  return {
    successCount: links.length,
    errorCount: errors.length,
    errors,
    links,
  };
}

/**
 * Parse JSON file (restore exported JSON backup)
 */
export function parseJSON(content: string): ImportResult {
  try {
    const data = JSON.parse(content);
    
    if (!Array.isArray(data)) {
      return { successCount: 0, errorCount: 0, errors: [{ row: 0, error: 'JSON deve ser um array' }], links: [] };
    }

    const links: Omit<LinkItem, "id" | "createdAt" | "position">[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    data.forEach((item, idx) => {
      try {
        const linkData = {
          title: item.title || '',
          url: item.url || '',
          category: item.category || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          description: item.description,
          isFavorite: !!item.isFavorite,
          favicon: item.favicon || '',
        };

        const validated = linkSchema.parse(linkData);
        links.push(validated);
      } catch (err) {
        const errorMsg = err instanceof ZodError 
          ? err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
          : err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: idx + 1, error: errorMsg });
      }
    });

    return {
      successCount: links.length,
      errorCount: errors.length,
      errors,
      links,
    };
  } catch (err) {
    return { 
      successCount: 0, 
      errorCount: 0, 
      errors: [{ row: 0, error: 'JSON inválido' }], 
      links: [] 
    };
  }
}
