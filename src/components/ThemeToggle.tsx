import { Moon, Sun, Waves, Sunset, TreePine, Flower2, Sparkles, Eclipse, Palette, Check, ScrollText, Leaf, Citrus } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const THEME_MOTION_STORAGE_KEY = "theme-motion-intensity";
type ThemeMotionIntensity = "off" | "soft" | "strong";

const themes = [
  {
    id: "light",
    label: "Claro",
    icon: Sun,
    preview: "bg-slate-100 border-slate-400",
    color: "text-amber-500",
  },
  {
    id: "paper",
    label: "Paper",
    icon: ScrollText,
    preview: "bg-stone-100 border-amber-700",
    color: "text-amber-700",
  },
  {
    id: "mint",
    label: "Mint",
    icon: Leaf,
    preview: "bg-emerald-100 border-emerald-600",
    color: "text-emerald-600",
  },
  {
    id: "peach",
    label: "Peach",
    icon: Citrus,
    preview: "bg-orange-200 border-orange-600",
    color: "text-orange-600",
  },
  {
    id: "dark",
    label: "Escuro",
    icon: Moon,
    preview: "bg-gray-900 border-gray-700",
    color: "text-blue-400",
  },
  {
    id: "ocean",
    label: "Oceano",
    icon: Waves,
    preview: "bg-cyan-200 border-cyan-500",
    color: "text-sky-500",
  },
  {
    id: "sunset",
    label: "Pôr do Sol",
    icon: Sunset,
    preview: "bg-amber-200 border-orange-500",
    color: "text-orange-500",
  },
  {
    id: "forest",
    label: "Floresta",
    icon: TreePine,
    preview: "bg-lime-200 border-green-600",
    color: "text-green-600",
  },
  {
    id: "rose",
    label: "Rosé",
    icon: Flower2,
    preview: "bg-rose-200 border-pink-600",
    color: "text-pink-500",
  },
  {
    id: "lavender",
    label: "Lavanda",
    icon: Sparkles,
    preview: "bg-violet-200 border-violet-600",
    color: "text-purple-500",
  },
  {
    id: "midnight",
    label: "Meia-Noite",
    icon: Eclipse,
    preview: "bg-indigo-950 border-indigo-800",
    color: "text-indigo-400",
  },
] as const;

const recommendedThemeIds = ["paper", "mint", "peach"] as const;
const classicThemeIds = ["light", "ocean", "sunset", "forest", "rose", "lavender", "dark", "midnight"] as const;

const themeMap = Object.fromEntries(themes.map((t) => [t.id, t])) as Record<(typeof themes)[number]["id"], (typeof themes)[number]>;

const recommendedThemes = recommendedThemeIds.map((id) => themeMap[id]);
const classicThemes = classicThemeIds.map((id) => themeMap[id]);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [motionIntensity, setMotionIntensity] = useState<ThemeMotionIntensity>("soft");

  useEffect(() => {
    const value = window.localStorage.getItem(THEME_MOTION_STORAGE_KEY);
    const initialValue: ThemeMotionIntensity = value === "off" || value === "strong" ? value : "soft";

    setMotionIntensity(initialValue);
    document.documentElement.setAttribute("data-theme-motion", initialValue);
  }, []);

  const updateMotionIntensity = (value: ThemeMotionIntensity) => {
    setMotionIntensity(value);
    window.localStorage.setItem(THEME_MOTION_STORAGE_KEY, value);
    document.documentElement.setAttribute("data-theme-motion", value);
  };

  const renderThemeButton = (t: (typeof themes)[number]) => {
    const Icon = t.icon;
    const isActive = theme === t.id;

    return (
      <button
        key={t.id}
        onClick={() => setTheme(t.id)}
        className={cn(
          "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground"
        )}
      >
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2",
            t.preview
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", t.color)} />
        </div>
        <span className="flex-1 text-left">{t.label}</span>
        {isActive && <Check className="h-4 w-4 text-primary" />}
      </button>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Alterar tema"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2" align="end">
        <div className="grid gap-1">
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recomendados
          </p>
          {recommendedThemes.map(renderThemeButton)}

          <div className="my-1 h-px bg-border" />

          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Classicos
          </p>
          {classicThemes.map(renderThemeButton)}

          <div className="my-1 h-px bg-border" />

          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Animacao
          </p>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
            <Button
              type="button"
              variant={motionIntensity === "off" ? "default" : "outline"}
              size="sm"
              onClick={() => updateMotionIntensity("off")}
              className="h-8"
            >
              Sem
            </Button>
            <Button
              type="button"
              variant={motionIntensity === "soft" ? "default" : "outline"}
              size="sm"
              onClick={() => updateMotionIntensity("soft")}
              className="h-8"
            >
              Suave
            </Button>
            <Button
              type="button"
              variant={motionIntensity === "strong" ? "default" : "outline"}
              size="sm"
              onClick={() => updateMotionIntensity("strong")}
              className="h-8"
            >
              Forte
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
