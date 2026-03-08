import { useState, useCallback } from "react";
import {
  Bookmark,
  Star,
  FolderOpen,
  Tag,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Palette,
} from "lucide-react";
import { getCategoryIcon, isCustomIcon, CATEGORY_COLORS } from "@/lib/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPicker } from "@/components/IconPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ICON_BTN_SM_CLASS, TEXT_XS_CLASS } from "@/lib/utils";
import type { Category } from "@/types/link";

interface AppSidebarProps {
  categories: Category[];
  allTags: string[];
  activeFilter: { type: "all" | "favorites" | "category" | "tag"; value?: string };
  onFilterChange: (filter: { type: "all" | "favorites" | "category" | "tag"; value?: string }) => void;
  onAddCategory: (name: string, icon: string, parentId?: string | null, color?: string | null) => void;
  onDeleteCategory: (id: string, cascade?: boolean) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDropLinkToCategory?: (linkId: string, categoryName: string) => void;
  onReorderCategories?: (categories: Category[]) => void;
  onUpdateCategoryColor?: (id: string, color: string | null) => void;
  onUpdateCategoryIcon?: (id: string, icon: string) => void;
}

// ✅ Helper: build the full "Parent / Child / Grandchild" name for a category
function buildFullName(cat: Category, allCategories: Category[]): string {
  const parts: string[] = [cat.name];
  let current = cat;
  while (current.parentId) {
    const parent = allCategories.find((c) => c.id === current.parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(" / ");
}

// ✅ Color Picker component
function ColorPicker({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-muted cursor-pointer transition-colors"
          title="Escolher cor"
        >
          {value ? (
            <div
              className="h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: value }}
            />
          ) : (
            <Palette className="h-3 w-3" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="space-y-2">
          <p className={`${TEXT_XS_CLASS} font-medium`}>Cor da categoria</p>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  value === color ? "border-foreground scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => onChange(color)}
                title={color}
              />
            ))}
          </div>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className={`w-full ${TEXT_XS_CLASS} h-7 mt-1`}
              onClick={() => onChange(null)}
            >
              Remover cor
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppSidebar({
  categories,
  allTags,
  activeFilter,
  onFilterChange,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onDropLinkToCategory,
  onReorderCategories,
  onUpdateCategoryColor,
  onUpdateCategoryIcon,
}: AppSidebarProps) {
  const [dropTargetCat, setDropTargetCat] = useState<string | null>(null);
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dropTargetCatId, setDropTargetCatId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"top" | "bottom">("bottom");
  const [justDroppedCatId, setJustDroppedCatId] = useState<string | null>(null);

  // Link dragging onto categories
  const handleCatDragOver = (e: React.DragEvent, catName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetCat(catName);
  };

  const handleCatDragLeave = () => {
    setDropTargetCat(null);
    setDropTargetCatId(null);
    setDropPosition("bottom");
  };

  const handleCatDrop = (e: React.DragEvent, catName: string, targetCatId?: string) => {
    e.preventDefault();
    // Check if it's a category reorder
    const catId = e.dataTransfer.getData("application/category-id");
    if (catId && draggedCatId && targetCatId && onReorderCategories) {
      const draggedCat = categories.find((c) => c.id === draggedCatId);
      const targetCat = categories.find((c) => c.id === targetCatId);

      if (draggedCat && targetCat && draggedCat.parentId === targetCat.parentId) {
        const siblingCategories = categories
          .filter((c) => c.parentId === draggedCat.parentId)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const dragIdx = siblingCategories.findIndex((c) => c.id === draggedCatId);
        const targetIdx = siblingCategories.findIndex((c) => c.id === targetCatId);

        if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
          const nextSiblings = [...siblingCategories];
          const [moved] = nextSiblings.splice(dragIdx, 1);
          nextSiblings.splice(targetIdx, 0, moved);

          const nextById = new Map(categories.map((cat) => [cat.id, cat]));
          nextSiblings.forEach((cat, idx) => {
            nextById.set(cat.id, { ...cat, position: idx });
          });

          onReorderCategories(Array.from(nextById.values()));
          setJustDroppedCatId(draggedCatId);
          window.setTimeout(() => setJustDroppedCatId(null), 360);
        }
      }

      setDraggedCatId(null);
      setDropTargetCatId(null);
      setDropTargetCat(null);
      setDropPosition("bottom");
      return;
    }

    // Otherwise it's a link drag
    const linkId = e.dataTransfer.getData("text/plain");
    if (linkId && onDropLinkToCategory) {
      onDropLinkToCategory(linkId, catName);
    }
    setDropTargetCat(null);
  };

  // ✅ Category reorder via drag & drop
  const handleCatDragStart = (e: React.DragEvent, catId: string) => {
    setDraggedCatId(catId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/category-id", catId);
  };

  const handleCatReorderDragOver = (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault();
    if (draggedCatId && draggedCatId !== targetCatId) {
      setDropTargetCatId(targetCatId);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      setDropPosition(offsetY < rect.height / 2 ? "top" : "bottom");
    }
  };

  const handleCatDragEnd = () => {
    setDraggedCatId(null);
    setDropTargetCatId(null);
    setDropTargetCat(null);
    setDropPosition("bottom");
  };

  const [newCat, setNewCat] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Folder");
  const [newCatColor, setNewCatColor] = useState<string | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [addingSubcatForId, setAddingSubcatForId] = useState<string | null>(null);
  const [newSubcat, setNewSubcat] = useState("");
  const [newSubcatIcon, setNewSubcatIcon] = useState("Tag");
  const [newSubcatColor, setNewSubcatColor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Folder");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; hasChildren: boolean } | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (type: string, value?: string) =>
    activeFilter.type === type && activeFilter.value === value;

  const getChildren = useCallback(
    (parentId: string) =>
      categories
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [categories]
  );

  const rootCategories = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const hasDescendants = useCallback(
    (id: string): boolean => categories.some((c) => c.parentId === id),
    [categories]
  );

  // ✅ Handle delete with confirmation
  const handleDeleteClick = (cat: Category) => {
    const children = hasDescendants(cat.id);
    setDeleteConfirm({
      id: cat.id,
      name: cat.name,
      hasChildren: !!children,
    });
  };

  // ✅ Recursive category renderer
  const renderCategory = (cat: Category, depth: number = 0) => {
    const catIsCustomIcon = isCustomIcon(cat.icon);
    const IconComponent = !catIsCustomIcon ? getCategoryIcon(cat.icon) : null;
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    const fullName = buildFullName(cat, categories);
    const maxDepth = 2; // 0, 1, 2 = 3 levels
    const canAddChild = depth < maxDepth;

    return (
      <div key={cat.id} className="space-y-0.5">
        <SidebarMenuItem>
          {editingId === cat.id ? (
            <div className="flex items-center gap-1 px-2" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
              <IconPicker value={editIcon} onSelect={setEditIcon} />
              <Input
                autoFocus
                id={`edit-category-${cat.id}`}
                name="editCategory"
                className={`h-7 ${TEXT_XS_CLASS}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editName.trim()) {
                    onRenameCategory(cat.id, editName.trim());
                    if (onUpdateCategoryIcon && editIcon !== cat.icon) {
                      onUpdateCategoryIcon(cat.id, editIcon);
                    }
                    setEditingId(null);
                  }
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <Button variant="ghost" size="icon" className={ICON_BTN_SM_CLASS} onClick={() => {
                if (editName.trim()) onRenameCategory(cat.id, editName.trim());
                if (onUpdateCategoryIcon && editIcon !== cat.icon) {
                  onUpdateCategoryIcon(cat.id, editIcon);
                }
                setEditingId(null);
              }}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className={ICON_BTN_SM_CLASS} onClick={() => setEditingId(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <SidebarMenuButton
              draggable
              onDragStart={(e) => handleCatDragStart(e, cat.id)}
              onDragEnd={handleCatDragEnd}
              onClick={() => {
                if (hasChildren) toggleExpanded(cat.id);
                onFilterChange({ type: "category", value: fullName });
              }}
              onDragOver={(e) => {
                handleCatDragOver(e, fullName);
                handleCatReorderDragOver(e, cat.id);
              }}
              onDragLeave={handleCatDragLeave}
              onDrop={(e) => handleCatDrop(e, fullName, cat.id)}
              className={`group/cat transition-colors ${
                dropTargetCat === fullName
                  ? "bg-primary/15 ring-1 ring-primary/40 scale-[1.02]"
                  : ""
              } ${
                dropTargetCatId === cat.id && draggedCatId
                  ? dropPosition === "top"
                    ? "border-t-2 border-primary"
                    : "border-b-2 border-primary"
                  : ""
              } ${
                draggedCatId === cat.id ? "opacity-40" : ""
              } ${
                justDroppedCatId === cat.id ? "snap-animate" : ""
              } ${
                isActive("category", fullName)
                  ? "bg-accent text-accent-foreground font-medium"
                  : ""
              }`}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              {/* Drag handle */}
              <GripVertical className="h-3 w-3 opacity-50 group-hover/cat:opacity-80 cursor-grab shrink-0" />

              {/* Color dot */}
              {cat.color && (
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
              )}

              {/* Expand/collapse chevron */}
              {hasChildren ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(cat.id);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleExpanded(cat.id); } }}
                  className="shrink-0 cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </div>
              ) : (
                <span className="w-3.5 shrink-0" />
              )}

              {catIsCustomIcon ? (
                <img src={cat.icon} alt="" className="h-4 w-4 shrink-0 object-contain" />
              ) : IconComponent ? (
                <IconComponent className="h-4 w-4 shrink-0" />
              ) : null}
              <span className="flex-1 truncate">{cat.name}</span>

              {/* Actions */}
              <span className="ml-auto flex gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity shrink-0">
                {/* Color picker */}
                {onUpdateCategoryColor && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <ColorPicker
                      value={cat.color}
                      onChange={(color) => onUpdateCategoryColor(cat.id, color)}
                    />
                  </div>
                )}

                {/* Add subcategory */}
                {canAddChild && (
                  <div
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer p-1 hover:bg-muted rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingSubcatForId(cat.id);
                      setNewSubcat("");
                      setNewSubcatIcon("Tag");
                      setNewSubcatColor(null);
                      setExpandedIds((prev) => new Set([...prev, cat.id]));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setAddingSubcatForId(cat.id);
                        setNewSubcat("");
                        setNewSubcatIcon("Tag");
                        setNewSubcatColor(null);
                        setExpandedIds((prev) => new Set([...prev, cat.id]));
                      }
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer p-1 hover:bg-muted rounded transition-colors"
                  onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); setEditIcon(cat.icon); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); setEditIcon(cat.icon); } }}
                >
                  <Pencil className="h-3 w-3" />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer p-1 hover:bg-muted rounded transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(cat); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleDeleteClick(cat); } }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </div>
              </span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>

        {/* Add subcategory input */}
        {addingSubcatForId === cat.id && (
          <SidebarMenuItem>
            <div className="flex items-center gap-1 px-2" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              <IconPicker value={newSubcatIcon} onSelect={setNewSubcatIcon} />
              <Input
                autoFocus
                id={`new-subcategory-${cat.id}`}
                name="newSubcategory"
                className={`h-7 ${TEXT_XS_CLASS} flex-1`}
                value={newSubcat}
                onChange={(e) => setNewSubcat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSubcat.trim()) {
                    onAddCategory(newSubcat.trim(), newSubcatIcon, cat.id, newSubcatColor);
                    setNewSubcat("");
                    setNewSubcatIcon("Tag");
                    setNewSubcatColor(null);
                    setAddingSubcatForId(null);
                  }
                  if (e.key === "Escape") setAddingSubcatForId(null);
                }}
                placeholder="Nova subcategoria"
              />
              <Button
                variant="ghost"
                size="icon"
                className={ICON_BTN_SM_CLASS}
                onClick={() => {
                  if (newSubcat.trim()) {
                    onAddCategory(newSubcat.trim(), newSubcatIcon, cat.id, newSubcatColor);
                    setNewSubcat("");
                    setNewSubcatIcon("Tag");
                    setNewSubcatColor(null);
                  }
                  setAddingSubcatForId(null);
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </SidebarMenuItem>
        )}

        {/* Render children recursively */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sidebar className="border-r">
      <SidebarContent className="pt-4">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onFilterChange({ type: "all" })}
                  className={isActive("all") ? "bg-accent text-accent-foreground font-medium" : ""}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  <span>Todos os Links</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onFilterChange({ type: "favorites" })}
                  className={isActive("favorites") ? "bg-accent text-accent-foreground font-medium" : ""}
                >
                  <Star className="mr-2 h-4 w-4" />
                  <span>Favoritos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Categories */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-2">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" /> Categorias
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setAddingCat(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {addingCat && (
                <SidebarMenuItem>
                  <div className="flex items-center gap-1 px-2">
                    <IconPicker
                      value={newCatIcon}
                      onSelect={setNewCatIcon}
                    />
                    <Input
                      autoFocus
                      id="new-category"
                      name="newCategory"
                      className={`h-7 ${TEXT_XS_CLASS} flex-1`}
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCat.trim()) {
                          onAddCategory(newCat.trim(), newCatIcon, null, newCatColor);
                          setNewCat("");
                          setNewCatIcon("Folder");
                          setNewCatColor(null);
                          setAddingCat(false);
                        }
                        if (e.key === "Escape") setAddingCat(false);
                      }}
                      placeholder="Nova categoria"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className={ICON_BTN_SM_CLASS}
                      onClick={() => {
                        if (newCat.trim()) {
                          onAddCategory(newCat.trim(), newCatIcon, null, newCatColor);
                          setNewCat("");
                          setNewCatIcon("Folder");
                          setNewCatColor(null);
                        }
                        setAddingCat(false);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </SidebarMenuItem>
              )}
              {rootCategories.map((cat) => renderCategory(cat, 0))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tags */}
        {allTags.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <Tag className="mr-1.5 h-3.5 w-3.5" /> Tags
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {allTags.map((tag) => (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton
                      onClick={() => onFilterChange({ type: "tag", value: tag })}
                      className={isActive("tag", tag) ? "bg-accent text-accent-foreground font-medium" : ""}
                    >
                      <span className="truncate">{tag}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ✅ Cascade delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria &quot;{deleteConfirm?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.hasChildren
                ? "Esta categoria possui subcategorias. Todas as subcategorias e links associados serão movidos para \"Sem categoria\"."
                : "Os links associados a esta categoria serão movidos para \"Sem categoria\". Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  onDeleteCategory(deleteConfirm.id, deleteConfirm.hasChildren);
                  setDeleteConfirm(null);
                }
              }}
            >
              {deleteConfirm?.hasChildren ? "Excluir tudo" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
