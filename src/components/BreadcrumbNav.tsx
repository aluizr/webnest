import { ChevronRight, Home } from "lucide-react";
import type { Category } from "@/types/link";

interface BreadcrumbNavProps {
  /** Full category name like "Dev / Frontend / React" */
  categoryFilter: string | null;
  categories: Category[];
  onNavigate: (categoryFullName: string | null) => void;
}

export function BreadcrumbNav({ categoryFilter, categories, onNavigate }: BreadcrumbNavProps) {
  if (!categoryFilter) return null;

  const parts = categoryFilter.split(" / ");

  // Build breadcrumb items with their full path names
  const crumbs = parts.map((part, index) => ({
    label: part,
    fullPath: parts.slice(0, index + 1).join(" / "),
    isLast: index === parts.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-3 flex-wrap" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-muted"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Todos</span>
      </button>

      {crumbs.map((crumb) => (
        <span key={crumb.fullPath} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground px-1.5 py-0.5">
              {crumb.label}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(crumb.fullPath)}
              className="hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-muted"
            >
              {crumb.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
