import { useState } from "react";
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
  Folder,
  BookOpen,
  Code,
  Palette,
  Music,
  Video,
  Image,
  News,
  Briefcase,
  Heart,
  Shield,
  Settings,
  Layout,
  Lightbulb,
  Zap,
  TrendingUp,
  ShoppingCart,
  Archive,
  Globe,
  Database,
  Cloud,
  Cpu,
  Award,
  Radio,
  Gamepad2,
  LucideIcon,
} from "lucide-react";
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
import type { Category } from "@/types/link";

const ICON_MAP: Record<string, LucideIcon> = {
  Folder,
  BookOpen,
  Code,
  Palette,
  Music,
  Video,
  Image,
  News,
  Briefcase,
  Heart,
  Star,
  Shield,
  Settings,
  Layout,
  Lightbulb,
  Zap,
  Trending: TrendingUp,
  Shopping: ShoppingCart,
  Archive,
  Tag,
  Globe,
  Database,
  Cloud,
  Cpu,
  Award,
  Radio,
  Gamepad2,
};

const getCategoryIcon = (iconName: string): LucideIcon => {
  return ICON_MAP[iconName] || ICON_MAP.Folder;
};

interface AppSidebarProps {
  categories: Category[];
  allTags: string[];
  activeFilter: { type: "all" | "favorites" | "category" | "tag"; value?: string };
  onFilterChange: (filter: { type: "all" | "favorites" | "category" | "tag"; value?: string }) => void;
  onAddCategory: (name: string, icon: string) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string) => void;
}

export function AppSidebar({
  categories,
  allTags,
  activeFilter,
  onFilterChange,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
}: AppSidebarProps) {
  const [newCat, setNewCat] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Folder");
  const [addingCat, setAddingCat] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const isActive = (type: string, value?: string) =>
    activeFilter.type === type && activeFilter.value === value;

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
                      className="h-7 text-xs flex-1"
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCat.trim()) {
                          onAddCategory(newCat.trim(), newCatIcon);
                          setNewCat("");
                          setNewCatIcon("Folder");
                          setAddingCat(false);
                        }
                        if (e.key === "Escape") setAddingCat(false);
                      }}
                      placeholder="Nova categoria"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        if (newCat.trim()) {
                          onAddCategory(newCat.trim(), newCatIcon);
                          setNewCat("");
                          setNewCatIcon("Folder");
                        }
                        setAddingCat(false);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </SidebarMenuItem>
              )}
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat.icon);
                return (
                <SidebarMenuItem key={cat.id}>
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-1 px-2">
                      <Input
                        autoFocus
                        className="h-7 text-xs"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editName.trim()) {
                            onRenameCategory(cat.id, editName.trim());
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        if (editName.trim()) onRenameCategory(cat.id, editName.trim());
                        setEditingId(null);
                      }}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <SidebarMenuButton
                      onClick={() => onFilterChange({ type: "category", value: cat.name })}
                      className={`group/cat ${isActive("category", cat.name) ? "bg-accent text-accent-foreground font-medium" : ""}`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="flex-1 truncate">{cat.name}</span>
                      <span className="ml-auto flex gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
                );
              })}
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
    </Sidebar>
  );
}
