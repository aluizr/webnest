import { useMemo } from "react";

/**
 * Simple Markdown → HTML renderer.
 * Supports: headings, bold, italic, inline code, code blocks, links, images,
 * unordered lists, ordered lists, blockquotes, horizontal rules, strikethrough.
 */
function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="rounded-md bg-muted p-2 text-xs overflow-x-auto my-1"><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">$1</code>');

  // Images before links (![alt](url))
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-1" loading="lazy" />');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>');

  // Headings (### h3, ## h2, # h1)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2 mb-0.5">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-2 mb-0.5">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-2 mb-0.5">$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-2 border-t" />');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-muted-foreground/30 pl-3 my-1 text-muted-foreground italic">$1</blockquote>');

  // Unordered lists
  html = html.replace(/^[*\-+] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="my-1">${match}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  html = html.replace(/(<li class="ml-4 list-decimal">.*<\/li>\n?)+/g, (match) => `<ol class="my-1">${match}</ol>`);

  // Line breaks — convert remaining newlines to <br>
  html = html.replace(/\n/g, '<br />');

  return html;
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
