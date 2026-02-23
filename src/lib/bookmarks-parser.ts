import type { LinkItem } from "@/types/link";

export interface BookmarkFolder {
  name: string;
  children: (BookmarkFolder | BookmarkLink)[];
}

export interface BookmarkLink {
  url: string;
  title: string;
  addDate?: number;
}

/**
 * Parseia arquivo HTML de bookmarks (formato padrão de Chrome, Firefox, Safari, Edge)
 * Estrutura HTML:
 * <DL>
 *   <DT><H3>Folder Name</H3></DT>
 *   <DL>
 *     <DT><A HREF="url" ADD_DATE="timestamp">Title</A></DT>
 *   </DL>
 * </DL>
 */
export function parseBookmarksHTML(htmlContent: string): BookmarkFolder[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Arquivo HTML inválido");
  }

  // Procurar por <DL> (definition list)
  const dlElements = doc.querySelectorAll("dl");
  if (dlElements.length === 0) {
    throw new Error("Formato de bookmarks não reconhecido. Certifique-se de que exportou os bookmarks do seu navegador.");
  }

  const rootFolders: BookmarkFolder[] = [];

  // Processar primeira DL (raiz)
  if (dlElements.length > 0) {
    const rootDl = dlElements[0];
    parseBookmarkFolder(rootDl, rootFolders);
  }

  return rootFolders;
}

function parseBookmarkFolder(
  dlElement: Element,
  output: (BookmarkFolder | BookmarkLink)[]
): void {
  let currentFolder: BookmarkFolder | null = null;

  for (const node of dlElement.children) {
    if (node.tagName === "DT") {
      // Procurar por <H3> (pasta) ou <A> (link)
      const h3 = node.querySelector("h3");
      if (h3) {
        // É uma pasta
        const folderName = h3.textContent?.trim() || "Sem nome";
        currentFolder = {
          name: folderName,
          children: [],
        };
        output.push(currentFolder);

        // Procurar por próxima DL (filhos da pasta)
      } else {
        // Procurar por <A> (link)
        const a = node.querySelector("a");
        if (a) {
          const url = a.getAttribute("href") || "";
          const title = a.textContent?.trim() || url;
          const addDateAttr = a.getAttribute("add_date");
          const addDate = addDateAttr ? parseInt(addDateAttr, 10) : undefined;

          const link: BookmarkLink = {
            url,
            title,
            addDate,
          };

          if (currentFolder) {
            currentFolder.children.push(link);
          } else {
            output.push(link);
          }
        }
      }
    } else if (node.tagName === "DL" && currentFolder) {
      // DL dentro de DT (filhos de folder)
      parseBookmarkFolder(node, currentFolder.children);
    }
  }
}

/**
 * Converte bookmarks parseados em LinkItems
 * Usa estrutura de pasta para criar categorias
 */
export function bookmarksToLinks(bookmarks: (BookmarkFolder | BookmarkLink)[]): LinkItem[] {
  const links: LinkItem[] = [];
  let position = 0;

  function processBookmarks(
    items: (BookmarkFolder | BookmarkLink)[],
    parentCategory: string = ""
  ): void {
    for (const item of items) {
      if ("url" in item) {
        // É um link
        const link: LinkItem = {
          id: generateId(),
          url: item.url,
          title: item.title || item.url,
          description: "",
          category: parentCategory,
          tags: [],
          isFavorite: false,
          favicon: extractFaviconFromUrl(item.url),
          createdAt: item.addDate
            ? new Date(item.addDate * 1000).toISOString()
            : new Date().toISOString(),
          position: position++,
          ogImage: "",
          notes: "",
        };
        links.push(link);
      } else {
        // É uma pasta
        const newCategory = parentCategory
          ? `${parentCategory} / ${item.name}`
          : item.name;
        processBookmarks(item.children, newCategory);
      }
    }
  }

  processBookmarks(bookmarks);
  return links;
}

/**
 * Exporta links como arquivo HTML de bookmarks (compatível com navegadores)
 */
export function linksToBookmarksHTML(
  links: LinkItem[],
  categories: { id: string; name: string; parentId?: string | null }[]
): string {
  // Construir árvore de categorias
  const categoryMap = new Map<string, string[]>();
  for (const link of links) {
    const cat = link.category || "Sem categoria";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(link.id);
  }

  // Gerar HTML com estrutura de bookmarks
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- Exportado de WebNest em ${new Date().toLocaleString()} -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Adicionar cada categoria como pasta
  for (const [category, linkIds] of categoryMap) {
    const escapedCategory = escapeHtml(category);
    const addDate = Math.floor(Date.now() / 1000);

    html += `  <DT><H3 ADD_DATE="${addDate}">${escapedCategory}</H3></DT>\n`;
    html += `  <DL><p>\n`;

    for (const linkId of linkIds) {
      const link = links.find((l) => l.id === linkId);
      if (link) {
        const escapedTitle = escapeHtml(link.title);
        const escapedUrl = escapeHtml(link.url);
        const timestamp = Math.floor(new Date(link.createdAt).getTime() / 1000);

        html += `    <DT><A HREF="${escapedUrl}" ADD_DATE="${timestamp}" ICON="${link.favicon}">${escapedTitle}</A></DT>\n`;
      }
    }

    html += `  </DL><p>\n`;
  }

  html += `</DL><p>`;

  return html;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function extractFaviconFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://icon.horse/icon/${hostname}?size=32`;
  } catch {
    return "";
  }
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
