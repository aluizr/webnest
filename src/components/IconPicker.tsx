import * as React from "react";
import { ICON_MAP, ICON_NAMES, ICON_CATEGORIES, ICON_CATEGORY_NAMES, isCustomIcon, MAX_CUSTOM_ICON_SIZE, ACCEPTED_ICON_TYPES } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Search, Upload, X, ImageIcon } from "lucide-react";

interface IconPickerProps {
  value: string;
  onSelect: (icon: string) => void;
}

const POPULAR_ICONS = [
  "Folder", "Star", "Heart", "Bookmark", "Tag", "Home",
  "Code", "Globe", "Music", "Image", "Video", "Camera",
  "Book", "BookOpen", "GraduationCap", "Briefcase",
  "ShoppingCart", "Coffee", "Gamepad2", "Palette",
  "Rocket", "Zap", "Lightbulb", "Brain", "Sparkles",
  "Shield", "Lock", "Key", "Settings", "Wrench",
  "MapPin", "Flag", "Calendar", "Clock",
  "Mail", "MessageCircle", "Users", "Phone",
  "DollarSign", "CreditCard", "TrendingUp",
  "Sun", "Moon", "Flame", "Leaf",
  "Trophy", "Award", "Gift", "Crown",
];

export function IconPicker({ value, onSelect }: IconPickerProps) {
  const isCustom = isCustomIcon(value);
  const CurrentIcon = !isCustom ? (ICON_MAP[value] || ICON_MAP.Folder) : null;
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"library" | "upload">("library");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const displayedIcons = React.useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return ICON_NAMES.filter((name) => name.toLowerCase().includes(q)).slice(0, 120);
    }
    if (activeCategory) {
      const catIcons = ICON_CATEGORIES[activeCategory] || [];
      return catIcons.filter((name) => name in ICON_MAP);
    }
    return POPULAR_ICONS.filter((name) => name in ICON_MAP);
  }, [search, activeCategory]);

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    setSearch("");
    setActiveCategory(null);
    setOpen(false);
    setTab("library");
    setUploadError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) return;

    if (!ACCEPTED_ICON_TYPES.includes(file.type)) {
      setUploadError("Formato não suportado. Use SVG, PNG, JPG, WebP ou GIF.");
      return;
    }

    if (file.size > MAX_CUSTOM_ICON_SIZE) {
      setUploadError(`Arquivo muito grande (máx. ${MAX_CUSTOM_ICON_SIZE / 1024}KB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleSelect(dataUrl);
    };
    reader.onerror = () => {
      setUploadError("Erro ao ler o arquivo.");
    };
    reader.readAsDataURL(file);

    // Reset input para permitir reenviar o mesmo arquivo
    e.target.value = "";
  };

  const handleRemoveCustom = () => {
    onSelect("Folder");
    setUploadError(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          title={isCustom ? "Ícone personalizado" : `Ícone: ${value}`}
        >
          {isCustom ? (
            <img src={value} alt="Ícone" className="h-4 w-4 object-contain" />
          ) : CurrentIcon ? (
            <CurrentIcon className="h-4 w-4" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" side="right">
        <div className="space-y-2">
          {/* Header with tabs */}
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "text-sm font-medium pb-1 border-b-2 transition-colors",
                tab === "library"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("library")}
            >
              Biblioteca
            </button>
            <button
              className={cn(
                "text-sm font-medium pb-1 border-b-2 transition-colors flex items-center gap-1",
                tab === "upload"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("upload")}
            >
              <Upload className="h-3 w-3" />
              Importar
            </button>
          </div>

          {tab === "library" ? (
            <>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar ícone... (ex: heart, folder, star)"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
                  className="h-8 text-xs pl-7"
                />
              </div>

              {/* Category pills */}
              {!search.trim() && (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  <button
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                      !activeCategory
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                    onClick={() => setActiveCategory(null)}
                  >
                    ⭐ Populares
                  </button>
                  {ICON_CATEGORY_NAMES.map((cat) => (
                    <button
                      key={cat}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Icon grid */}
              <div className="grid grid-cols-8 gap-1 max-h-52 overflow-y-auto">
                {displayedIcons.map((iconName) => {
                  const IconComponent = ICON_MAP[iconName];
                  if (!IconComponent) return null;
                  const isSelected = value === iconName;
                  return (
                    <Button
                      key={iconName}
                      variant={isSelected ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "h-8 w-8",
                        isSelected && "ring-2 ring-offset-1 ring-primary"
                      )}
                      onClick={() => handleSelect(iconName)}
                      title={iconName}
                    >
                      <IconComponent className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
              {displayedIcons.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum ícone encontrado
                </p>
              )}
              {search.trim() && displayedIcons.length >= 120 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Mostrando 120 resultados. Refine a busca.
                </p>
              )}
            </>
          ) : (
            /* Upload tab */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Importe um ícone do seu computador (SVG, PNG, JPG, WebP ou GIF, máx. 32KB).
              </p>

              {/* Current custom icon preview */}
              {isCustom && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <img src={value} alt="Ícone atual" className="h-10 w-10 object-contain rounded" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Ícone personalizado atual</p>
                    <p className="text-[10px] text-muted-foreground">Clique abaixo para trocar</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={handleRemoveCustom}
                    title="Remover ícone personalizado"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Upload area */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    // Simular o evento de input
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    if (fileInputRef.current) {
                      fileInputRef.current.files = dt.files;
                      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }
                }}
              >
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs font-medium">Arraste uma imagem aqui</p>
                <p className="text-[10px] text-muted-foreground mt-1">ou clique para selecionar</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_ICON_TYPES.join(",")}
                className="hidden"
                onChange={handleFileUpload}
              />

              {uploadError && (
                <p className="text-xs text-destructive text-center">{uploadError}</p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
