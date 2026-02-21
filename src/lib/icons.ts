import { icons, type LucideIcon } from "lucide-react";

// ✅ Todos os 1500+ ícones do Lucide disponíveis dinamicamente
export const ICON_MAP: Record<string, LucideIcon> = icons as unknown as Record<string, LucideIcon>;

export const ICON_NAMES = Object.keys(ICON_MAP);

// ✅ Categorias de ícones para navegação facilitada
export const ICON_CATEGORIES: Record<string, string[]> = {
  "Pastas": ["Folder", "FolderOpen", "FolderTree", "FolderArchive", "FolderCheck", "FolderClock", "FolderClosed", "FolderCog", "FolderDot", "FolderDown", "FolderGit", "FolderHeart", "FolderInput", "FolderKey", "FolderLock", "FolderMinus", "FolderOpen", "FolderOutput", "FolderPen", "FolderPlus", "FolderRoot", "FolderSearch", "FolderSymlink", "FolderSync", "FolderUp", "FolderX"],
  "Livros & Educação": ["BookOpen", "Book", "BookMarked", "BookText", "BookCopy", "BookDashed", "BookCheck", "BookPlus", "BookMinus", "BookX", "BookType", "GraduationCap", "School", "Library", "Notebook", "NotebookPen", "NotebookText"],
  "Código & Tech": ["Code", "CodeXml", "Terminal", "Cpu", "Database", "Cloud", "Server", "Globe", "Wifi", "Monitor", "Smartphone", "Laptop", "Tablet", "Router", "HardDrive", "MemoryStick", "CircuitBoard", "Binary", "Braces", "FileCode", "FileJson", "GitBranch", "GitCommit", "GitMerge", "Github"],
  "Mídia": ["Music", "Video", "Image", "Camera", "Film", "Mic", "Headphones", "Radio", "Tv", "Play", "Pause", "Volume2", "Speaker", "Disc", "Clapperboard", "Aperture", "Focus", "ScanLine"],
  "Trabalho": ["Briefcase", "Building", "Building2", "Factory", "Landmark", "Presentation", "FileText", "Files", "Clipboard", "ClipboardList", "ClipboardCheck", "Archive", "Inbox", "Printer", "Stamp", "Receipt"],
  "Finanças": ["DollarSign", "Wallet", "CreditCard", "PiggyBank", "Banknote", "BadgeDollarSign", "CircleDollarSign", "Coins", "HandCoins", "Receipt", "TrendingUp", "TrendingDown", "BarChart", "LineChart", "PieChart"],
  "Social": ["MessageCircle", "Mail", "Send", "Users", "UserPlus", "User", "UserCheck", "UserX", "UsersRound", "Contact", "Phone", "PhoneCall", "AtSign", "Share2", "MessagesSquare", "Reply"],
  "Segurança": ["Lock", "Key", "Eye", "EyeOff", "Shield", "ShieldCheck", "ShieldAlert", "ShieldOff", "Fingerprint", "ScanFace", "KeyRound", "LockOpen", "LockKeyhole"],
  "Ferramentas": ["Wrench", "Hammer", "Paintbrush", "Scissors", "Pen", "Pencil", "PenTool", "Eraser", "Ruler", "Pipette", "Brush", "Axe", "Drill", "Nut", "Shovel", "Screwdriver"],
  "Navegação": ["MapPin", "Navigation", "Compass", "Flag", "Bookmark", "Map", "Route", "Signpost", "Milestone", "LocateFixed", "Move", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"],
  "Tempo": ["Calendar", "Clock", "Timer", "AlarmClock", "CalendarDays", "CalendarCheck", "CalendarPlus", "CalendarRange", "Hourglass", "Watch", "TimerReset", "History", "CalendarHeart"],
  "Natureza": ["Sun", "Moon", "CloudRain", "Snowflake", "Flame", "Leaf", "TreePine", "Trees", "Flower", "Flower2", "Sprout", "Clover", "Mountain", "MountainSnow", "Waves", "Wind", "Tornado", "Rainbow", "CloudSun"],
  "Comida": ["Coffee", "Pizza", "Apple", "Cherry", "Grape", "Banana", "Citrus", "IceCreamCone", "CakeSlice", "Beef", "Egg", "Milk", "Wine", "Beer", "UtensilsCrossed", "CookingPot", "Soup", "Salad", "Popcorn", "Cookie", "Croissant", "Candy", "Sandwich"],
  "Esportes & Jogos": ["Gamepad2", "Trophy", "Medal", "Dumbbell", "Bike", "Volleyball", "Tennis", "Goal", "Swords", "Dice1", "Dice5", "Puzzle", "Target", "Crosshair", "Crown", "Flame"],
  "Viagem": ["Plane", "Car", "Rocket", "Ship", "Train", "Bus", "Truck", "Bike", "Fuel", "ParkingCircle", "Luggage", "Tent", "Anchor", "Sailboat", "Cable"],
  "Saúde": ["Stethoscope", "FlaskConical", "Microscope", "Pill", "Syringe", "Thermometer", "HeartPulse", "Activity", "Ambulance", "Hospital", "Cross", "Dna", "TestTube", "TestTubes", "Baby"],
  "Casa": ["Home", "Bed", "Bath", "Lamp", "LampDesk", "Armchair", "Sofa", "DoorOpen", "DoorClosed", "Warehouse", "Fence", "Trees", "Flower2", "Mailbox", "WashingMachine"],
  "Favoritos": ["Heart", "Star", "Sparkles", "Gem", "Diamond", "Award", "ThumbsUp", "Smile", "PartyPopper", "Gift", "Cake", "Rocket", "Zap", "Crown", "Wand2", "Bot", "Brain"],
  "Compras": ["ShoppingCart", "ShoppingBag", "Store", "Tag", "Tags", "Percent", "BadgePercent", "Package", "Box", "Truck", "Receipt", "Barcode", "QrCode", "ScanBarcode"],
  "Arte & Design": ["Palette", "Paintbrush", "PenTool", "Figma", "Layout", "LayoutGrid", "LayoutList", "Layers", "Shapes", "Triangle", "Circle", "Square", "Pentagon", "Hexagon", "Octagon", "Component", "Blend"],
};

export const ICON_CATEGORY_NAMES = Object.keys(ICON_CATEGORIES);

// ✅ Cores predefinidas para categorias
export const CATEGORY_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
  "#F43F5E", // rose
  "#78716C", // stone
];

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || ICON_MAP.Folder;
}

// ✅ Verificar se é ícone customizado (data URL ou URL externa)
export function isCustomIcon(icon: string): boolean {
  return icon.startsWith("data:") || icon.startsWith("http://") || icon.startsWith("https://");
}

// ✅ Tamanho máximo do ícone customizado (32KB)
export const MAX_CUSTOM_ICON_SIZE = 32 * 1024;

// ✅ Tipos de arquivo aceitos para ícones customizados
export const ACCEPTED_ICON_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp", "image/gif"];
