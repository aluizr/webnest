import { useState, useEffect, useRef } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, AlertCircle, Link2, StickyNote } from "lucide-react";
import { useMetadata } from "@/hooks/use-metadata";
import { useLinkDraft } from "@/hooks/use-link-draft";
import { useDuplicateDetector } from "@/hooks/use-duplicate-detector";
import { LinkPreview } from "@/components/LinkPreview";
import { RichTextEditor } from "@/components/RichTextEditor";
import { TEXT_XS_CLASS } from "@/lib/utils";
import type { LinkItem, Category, LinkPriority, LinkStatus } from "@/types/link";

interface LinkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  links: LinkItem[];
  editingLink?: LinkItem | null;
  onSubmit: (data: Omit<LinkItem, "id" | "createdAt" | "position">) => void | Promise<void>;
  onEditDuplicate?: (link: LinkItem) => void;
}

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function LinkForm({ open, onOpenChange, categories, links, editingLink, onSubmit, onEditDuplicate }: LinkFormProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [favicon, setFavicon] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [status, setStatus] = useState<LinkStatus>("backlog");
  const [priority, setPriority] = useState<LinkPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [forceAllowDuplicate, setForceAllowDuplicate] = useState(false);
  const { metadata, fetchMetadata } = useMetadata();
  const [autoFilledTitle, setAutoFilledTitle] = useState(false);
  const { hasDraft, draftData, saveDraft, restoreDraft, clearDraft, discardDraft } = useLinkDraft();
  const { isDuplicate, duplicateLink } = useDuplicateDetector(url, links, editingLink?.id);
  const draftTimeoutRef = useRef<NodeJS.Timeout>();
  const initialLoadDone = useRef(false);

  const parentCategories = categories.filter((c) => !c.parentId);

  // ✅ Build full name from category chain
  const buildFullName = (cat: Category): string => {
    const parts: string[] = [cat.name];
    let current = cat;
    while (current.parentId) {
      const parent = categories.find((c) => c.id === current.parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }
    return parts.join(" / ");
  };

  // ✅ Build flat list of all categories with indentation for select
  const buildCategoryOptions = () => {
    const options: { id: string; label: string; fullName: string; depth: number }[] = [];
    const addChildren = (parentId: string | null, depth: number) => {
      const children = categories
        .filter((c) => (parentId ? c.parentId === parentId : !c.parentId))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      for (const child of children) {
        options.push({
          id: child.id,
          label: "\u00A0\u00A0".repeat(depth) + child.name,
          fullName: buildFullName(child),
          depth,
        });
        addChildren(child.id, depth + 1);
      }
    };
    addChildren(null, 0);
    return options;
  };

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const categoryOptions = buildCategoryOptions();

  const resolveSelection = (categoryValue: string): string => {
    if (!categoryValue) return "";
    const found = categoryOptions.find((opt) => opt.fullName === categoryValue);
    return found?.id ?? "";
  };

  useEffect(() => {
    if (editingLink) {
      setUrl(editingLink.url);
      setTitle(editingLink.title);
      setDescription(editingLink.description);
      setSelectedCategoryId(resolveSelection(editingLink.category));
      setTags(editingLink.tags);
      setNotes(editingLink.notes || "");
      setFavicon(editingLink.favicon);
      setOgImage(editingLink.ogImage || "");
      setStatus(editingLink.status || "backlog");
      setPriority(editingLink.priority || "medium");
      setDueDate(editingLink.dueDate || "");
      setAutoFilledTitle(true);
      setShowDraftRecovery(false);
      setForceAllowDuplicate(false);
      initialLoadDone.current = true;
    } else {
      // Abrir formulário novo - mostrar opção de recuperar rascunho se existe
      if (open && hasDraft && !initialLoadDone.current) {
        setShowDraftRecovery(true);
      } else if (!open) {
        // Fechar formulário - resetar flag
        initialLoadDone.current = false;
        setForceAllowDuplicate(false);
      } else if (open && !hasDraft) {
        // Formulário aberto sem rascunho
        setUrl("");
        setTitle("");
        setDescription("");
        setSelectedCategoryId("");
        setTags([]);
        setNotes("");
        setFavicon("");
        setOgImage("");
        setStatus("backlog");
        setPriority("medium");
        setDueDate("");
        setAutoFilledTitle(false);
        setForceAllowDuplicate(false);
        initialLoadDone.current = true;
      }
    }
  }, [editingLink, open, categories, hasDraft]);

  // Reset forceAllowDuplicate quando URL mudar
  useEffect(() => {
    setForceAllowDuplicate(false);
  }, [url]);

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
        // Auto-fill OG image
        if (result.image) {
          setOgImage(result.image);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [url, editingLink, autoFilledTitle, title, description, fetchMetadata]);

  // Auto-save draft com debounce (não salva enquanto está editando um link existente)
  useEffect(() => {
    if (editingLink) return; // Não salvar rascunho enquanto edita um link

    // Limpar timeout anterior
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);

    // Agendar salvamento do rascunho
    const timer = setTimeout(() => {
      saveDraft({
        url,
        title,
        description,
        notes,
        selectedCategoryId,
        status,
        priority,
        dueDate: dueDate || null,
        tags,
        favicon,
        ogImage,
      });
    }, 500);

    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [url, title, description, notes, selectedCategoryId, status, priority, dueDate, tags, favicon, ogImage, editingLink, saveDraft]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Validar duplicata
    if (isDuplicate && !forceAllowDuplicate) {
      setForceAllowDuplicate(true);
      return;
    }

    const selectedOption = categoryOptions.find((opt) => opt.id === selectedCategoryId);
    const categoryValue = selectedOption?.fullName ?? "";
    const finalUrl = normalizeUrl(url);

    let fetchedTitle: string | null = null;
    let fetchedDescription: string | null = null;
    let fetchedImage: string | null = null;
    let fetchedFavicon: string | null = null;

    if (!editingLink && (!title.trim() || !description.trim() || !ogImage || !favicon)) {
      const fetched = await fetchMetadata(finalUrl);
      fetchedTitle = fetched.title;
      fetchedDescription = fetched.description;
      fetchedImage = fetched.image;
      fetchedFavicon = fetched.favicon;
    }

    await onSubmit({
      url: finalUrl,
      title: title.trim() || fetchedTitle || finalUrl,
      description: description.trim() || fetchedDescription || "",
      category: categoryValue,
      tags,
      notes: notes.trim(),
      isFavorite: editingLink?.isFavorite ?? false,
      favicon: favicon || fetchedFavicon || "",
      ogImage: ogImage || fetchedImage || "",
      status,
      priority,
      dueDate: dueDate || null,
    });
    // Limpar rascunho após envio bem-sucedido
    clearDraft();
    onOpenChange(false);
  };

  const handleRecoverDraft = () => {
    const draft = restoreDraft();
    if (draft) {
      setUrl(draft.url);
      setTitle(draft.title);
      setDescription(draft.description);
      setNotes(draft.notes || "");
      setSelectedCategoryId(draft.selectedCategoryId || draft.selectedParentId || "");
      setStatus(draft.status || "backlog");
      setPriority(draft.priority || "medium");
      setDueDate(draft.dueDate || "");
      setTags(draft.tags);
      setFavicon(draft.favicon);
      setOgImage(draft.ogImage || "");
      setAutoFilledTitle(!!draft.title); // Mark as auto-filled so it doesn't get overwritten
    }
    setShowDraftRecovery(false);
    initialLoadDone.current = true;
  };

  const handleDiscardDraft = () => {
    discardDraft();
    setShowDraftRecovery(false);
    setUrl("");
    setTitle("");
    setDescription("");
    setNotes("");
    setSelectedCategoryId("");
    setStatus("backlog");
    setPriority("medium");
    setDueDate("");
    setTags([]);
    setFavicon("");
    setOgImage("");
    setAutoFilledTitle(false);
    initialLoadDone.current = true;
  };

  const handleEditDuplicate = () => {
    if (duplicateLink && onEditDuplicate) {
      onEditDuplicate(duplicateLink);
      onOpenChange(false);
    }
  };

  return (
    <>
      {/* Dialog de recuperação de rascunho */}
      <AlertDialog open={showDraftRecovery} onOpenChange={setShowDraftRecovery}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Recuperar rascunho anterior?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Encontramos um rascunho de link salvo automaticamente. Deseja restaurá-lo ou descartar e começar do zero?
          </AlertDialogDescription>
          <div className="flex justify-end gap-3 pt-4">
            <AlertDialogCancel onClick={handleDiscardDraft}>
              Descartar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRecoverDraft} className="bg-primary">
              Recuperar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de aviso de duplicata */}
      <AlertDialog open={forceAllowDuplicate && isDuplicate && !!duplicateLink} onOpenChange={setForceAllowDuplicate}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Link duplicado encontrado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Já existe um link com esta mesma URL salvo:</p>
            {duplicateLink && (
              <div className="rounded-md bg-muted p-2 text-sm">
                <p className="font-semibold truncate">{duplicateLink.title}</p>
                <p className={`${TEXT_XS_CLASS} text-muted-foreground truncate`}>{duplicateLink.url}</p>
                <p className={`${TEXT_XS_CLASS} text-muted-foreground mt-1`}>
                  Adicionado em {new Date(duplicateLink.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </AlertDialogDescription>
          <div className="flex justify-end gap-3 pt-4">
            <AlertDialogCancel>Não, obrigado</AlertDialogCancel>
            {onEditDuplicate && duplicateLink && (
              <AlertDialogAction onClick={handleEditDuplicate} className="bg-blue-600">
                Editar link existente
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={() => setForceAllowDuplicate(false)} className="bg-primary">
              Adicionar mesmo assim
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog principal do formulário */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <DialogTitle>{editingLink ? "Editar Link" : "Novo Link"}</DialogTitle>
                <DialogDescription>
                  {editingLink ? "Atualize os dados do seu link" : "Adicione um novo link à sua coleção"}
                </DialogDescription>
              </div>
              {!editingLink && (url || title || description) && (
                <Badge variant="outline" className="whitespace-nowrap h-fit">
                  💾 Rascunho
                </Badge>
              )}
            </div>
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
          {isDuplicate && duplicateLink && !forceAllowDuplicate && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-blue-900 mb-1">
                <Link2 className="h-4 w-4" />
                Link já existe
              </p>
              <p className={`text-blue-800 ${TEXT_XS_CLASS} mb-2`}>
                Você já tem este link na sua coleção:
              </p>
              <p className={`text-blue-700 font-semibold ${TEXT_XS_CLASS} truncate`}>{duplicateLink.title}</p>
              {onEditDuplicate && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-blue-600 hover:text-blue-700"
                  onClick={handleEditDuplicate}
                >
                  Clicar para editar →
                </Button>
              )}
            </div>
          )}
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
            <Label className="flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Notas pessoais
            </Label>
            <RichTextEditor
              content={notes}
              onChange={setNotes}
              placeholder="Escreva suas notas..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-select">Categoria</Label>
            <select
              id="category-select"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status-select">Status</Label>
              <select
                id="status-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as LinkStatus)}
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">Em progresso</option>
                <option value="done">Concluído</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-select">Prioridade</Label>
              <select
                id="priority-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={priority}
                onChange={(e) => setPriority(e.target.value as LinkPriority)}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due-date">Data limite</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
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
    </>
  );
}
