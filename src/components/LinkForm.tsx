import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useMetadata } from "@/hooks/use-metadata";
import { LinkPreview } from "@/components/LinkPreview";
import type { LinkItem, Category } from "@/types/link";

interface LinkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editingLink?: LinkItem | null;
  onSubmit: (data: Omit<LinkItem, "id" | "createdAt" | "position">) => void; // ✅ Remover position
}

export function LinkForm({ open, onOpenChange, categories, editingLink, onSubmit }: LinkFormProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [favicon, setFavicon] = useState("");
  const { metadata, fetchMetadata } = useMetadata();
  const [autoFilledTitle, setAutoFilledTitle] = useState(false);

  const parentCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  const resolveSelection = (categoryValue: string) => {
    if (!categoryValue) return { parentId: "", childId: "" };

    const parent = parentCategories.find((p) => p.name === categoryValue);
    if (parent) return { parentId: parent.id, childId: "" };

    for (const child of childCategories) {
      const parentCat = parentCategories.find((p) => p.id === child.parentId);
      if (!parentCat) continue;
      const fullName = `${parentCat.name} / ${child.name}`;
      if (fullName === categoryValue) {
        return { parentId: parentCat.id, childId: child.id };
      }
    }

    return { parentId: "", childId: "" };
  };

  useEffect(() => {
    if (editingLink) {
      setUrl(editingLink.url);
      setTitle(editingLink.title);
      setDescription(editingLink.description);
      const selection = resolveSelection(editingLink.category);
      setSelectedParentId(selection.parentId);
      setSelectedChildId(selection.childId);
      setTags(editingLink.tags);
      setFavicon(editingLink.favicon);
      setAutoFilledTitle(true);
    } else {
      setUrl("");
      setTitle("");
      setDescription("");
      setSelectedParentId("");
      setSelectedChildId("");
      setTags([]);
      setFavicon("");
      setAutoFilledTitle(false);
    }
  }, [editingLink, open, categories]);

  // Auto-preview: when URL changes, try to get favicon and metadata
  useEffect(() => {
    if (!url) return;
    try {
      const hostname = new URL(url).hostname;
      // ✅ Usar icon.horse (mais privado que Google)
      setFavicon(`https://icon.horse/icon/${hostname}?size=32`);
    } catch {
      // invalid URL, ignore
    }

    // Fetch metadata with debounce (wait 500ms after user stops typing)
    const timer = setTimeout(() => {
      fetchMetadata(url).then((result) => {
        // Auto-fill title if not already set and we got a title from metadata
        if (!editingLink && !title && result.title && !autoFilledTitle) {
          setTitle(result.title);
          setAutoFilledTitle(true);
        }
        // Auto-fill description if it's empty
        if (!description && result.description) {
          setDescription(result.description);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [url, editingLink, autoFilledTitle, title, description, fetchMetadata]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const parent = parentCategories.find((p) => p.id === selectedParentId);
    const child = childCategories.find((c) => c.id === selectedChildId);
    const categoryValue = child && parent
      ? `${parent.name} / ${child.name}`
      : parent
        ? parent.name
        : "";
    onSubmit({
      url: url.trim(),
      title: title.trim() || url.trim(),
      description: description.trim(),
      category: categoryValue,
      tags,
      isFavorite: editingLink?.isFavorite ?? false,
      favicon,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingLink ? "Editar Link" : "Novo Link"}</DialogTitle>
          <DialogDescription>
            {editingLink ? "Atualize os dados do seu link" : "Adicione um novo link à sua coleção"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              placeholder="https://exemplo.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setAutoFilledTitle(false);
              }}
              required
            />
          </div>
          {url && <LinkPreview metadata={metadata} url={url} />}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Título do link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Breve descrição..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent-category">Categoria</Label>
            <select
              id="parent-category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedParentId}
              onChange={(e) => {
                setSelectedParentId(e.target.value);
                setSelectedChildId("");
              }}
            >
              <option value="">Sem categoria</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {selectedParentId &&
            childCategories.some((c) => c.parentId === selectedParentId) && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategoria</Label>
                <select
                  id="subcategory"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                >
                  <option value="">Sem subcategoria</option>
                  {childCategories
                    .filter((c) => c.parentId === selectedParentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                id="link-tags"
                name="tags"
                placeholder="Adicionar tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                +
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingLink ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
