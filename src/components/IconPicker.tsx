import * as React from "react";
import {
  Folder, BookOpen, Code, Palette, Music, Video, Image,
  News, Briefcase, Heart, Star, Shield, Settings, Layout,
  Lightbulb, Zap, TrendingUp, ShoppingCart, Archive, Tag,
  Globe, Database, Cloud, Cpu, Award, Radio, Gamepad2,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string;
  onSelect: (icon: string) => void;
}

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

const ICON_NAMES = Object.keys(ICON_MAP);

export function IconPicker({ value, onSelect }: IconPickerProps) {
  const CurrentIcon = ICON_MAP[value] || ICON_MAP.Folder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          title={`Ícone atual: ${value}`}
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium">Escolha um ícone</p>
          <div className="grid grid-cols-5 gap-2">
            {ICON_NAMES.map((iconName) => {
              const IconComponent = ICON_MAP[iconName];
              const isSelected = value === iconName;
              return (
                <Button
                  key={iconName}
                  variant={isSelected ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    isSelected && "ring-2 ring-offset-2"
                  )}
                  onClick={() => onSelect(iconName)}
                  title={iconName}
                >
                  <IconComponent className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
