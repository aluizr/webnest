import type { LinkItem } from "@/types/link";
import { linksToBookmarksHTML } from "@/lib/bookmarks-parser";

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export links as CSV
 */
export function exportAsCSV(links: LinkItem[]): Blob {
  const headers = ['Title', 'URL', 'Category', 'Tags', 'Favorite', 'Description', 'Created At'];
  
  const rows = links.map(link => [
    escapeCSV(link.title),
    escapeCSV(link.url),
    escapeCSV(link.category),
    escapeCSV(link.tags.join('; ')),
    link.isFavorite ? 'Yes' : 'No',
    escapeCSV(link.description),
    new Date(link.createdAt).toLocaleString('pt-BR'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export links as HTML table with styling
 */
export function exportAsHTML(links: LinkItem[], collectionName: string = 'Links'): Blob {
  const categoryColors: Record<string, string> = {
    'Desenvolvimento': '#3b82f6',
    'Design': '#ec4899',
    'Marketing': '#f59e0b',
    'Educação': '#10b981',
    'Entretenimento': '#8b5cf6',
    'Notícias': '#ef4444',
    'Produtividade': '#06b6d4',
    'Referência': '#6366f1',
  };

  const getCategoryColor = (category?: string) => categoryColors[category || ''] || '#9ca3af';

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${collectionName} - Internet Gems Finder</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f9fafb;
            color: #1f2937;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            margin-top: 0;
            color: #1f2937;
            font-size: 28px;
        }
        .info {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .info span {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        thead {
            background: #f3f4f6;
        }
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        tbody tr:hover {
            background: #f9fafb;
        }
        .url {
            color: #0066cc;
            text-decoration: none;
        }
        .url:hover {
            text-decoration: underline;
        }
        .category-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            color: white;
            font-size: 12px;
            font-weight: 500;
        }
        .favorite {
            color: #fbbf24;
            font-size: 16px;
        }
        .tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .tag {
            background: #f3f4f6;
            padding: 2px 8px;
            border-radius: 4px;
            color: #6b7280;
            font-size: 12px;
        }
        .description {
            color: #6b7280;
            font-size: 13px;
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 ${collectionName}</h1>
        <div class="info">
            <span>📊 Total: <strong>${links.length}</strong> links</span>
            <span>⭐ Favoritos: <strong>${links.filter(l => l.isFavorite).length}</strong></span>
            <span>📦 Categorias: <strong>${new Set(links.map(l => l.category).filter(Boolean)).size}</strong></span>
            <span>🏷️ Tags: <strong>${new Set(links.flatMap(l => l.tags)).size}</strong></span>
            <span>📅 Exportado: <strong>${new Date().toLocaleString('pt-BR')}</strong></span>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 30%">Título</th>
                    <th style="width: 25%">URL</th>
                    <th style="width: 12%">Categoria</th>
                    <th style="width: 15%">Tags</th>
                    <th style="width: 8%">Fav</th>
                    <th style="width: 20%">Descrição</th>
                    <th style="width: 12%">Data</th>
                </tr>
            </thead>
            <tbody>
                ${links
                  .map(
                    (link) => `
                    <tr>
                        <td><strong>${link.title}</strong></td>
                        <td><a href="${link.url}" class="url" target="_blank">${new URL(link.url).hostname}</a></td>
                        <td>
                            ${link.category
                              ? `<span class="category-badge" style="background: ${getCategoryColor(link.category)}">${link.category}</span>`
                              : '-'}
                        </td>
                        <td>
                            <div class="tags">
                                ${link.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </td>
                        <td>${link.isFavorite ? '<span class="favorite">★</span>' : '○'}</td>
                        <td class="description">${link.description || '-'}</td>
                        <td>${new Date(link.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
        <div class="footer">
            <p>Exportado por Internet Gems Finder • ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>`;

  return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
}

/**
 * Export links as JSON (existing format)
 */
export function exportAsJSON(links: LinkItem[]): Blob {
  const data = JSON.stringify(links, null, 2);
  return new Blob([data], { type: 'application/json' });
}

/**
 * Trigger file download
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export links as bookmarks HTML (compatible with all browsers)
 * Can be imported back into Chrome, Firefox, Safari, Edge, etc.
 */
export function exportAsBookmarks(
  links: LinkItem[],
  categories?: { id: string; name: string; parentId?: string | null }[]
): Blob {
  const bookmarksHTML = linksToBookmarksHTML(links, categories || []);
  return new Blob([bookmarksHTML], { type: 'text/html;charset=utf-8;' });
}
