import {
  Home,
  Layout,
  Calendar,
  Users,
  BarChart3,
  FileText,
  Zap,
  Brain,
  Weight,
  Hammer,
  ShoppingBag,
  Camera,
  Store,
  ShieldCheck,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Cloud,
  CloudCheck,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
  EyeOff,
  LogOut,
  Lock,
  ClipboardList,
  CheckCircle,
  Loader,
  AlertTriangle,
  Download,
  Edit,
  Trash2,
  LucideIcon,
} from 'lucide-react';

type TablerIconName = string;

const iconMap: Record<string, LucideIcon> = {
  'ti-home-2': Home,
  'ti-layout-kanban': Layout,
  'ti-calendar': Calendar,
  'ti-users': Users,
  'ti-chart-bar': BarChart3,
  'ti-file-analytics': FileText,
  'ti-zap': Zap,
  'ti-brain': Brain,
  'ti-weight': Weight,
  'ti-hammer': Hammer,
  'ti-shopping-bag': ShoppingBag,
  'ti-camera': Camera,
  'ti-building-store': Store,
  'ti-shield-check': ShieldCheck,
  'ti-settings-2': Settings,
  'ti-settings': Settings,
  'ti-search': Search,
  'ti-bell': Bell,
  'ti-sun': Sun,
  'ti-moon': Moon,
  'ti-cloud': Cloud,
  'ti-cloud-check': CloudCheck,
  'ti-chevron-up': ChevronUp,
  'ti-chevron-down': ChevronDown,
  'ti-chevron-left': ChevronLeft,
  'ti-chevron-right': ChevronRight,
  'ti-plus': Plus,
  'ti-filter': Filter,
  'ti-arrow-up': ArrowUp,
  'ti-arrow-down': ArrowDown,
  'ti-x': X,
  'ti-eye': Eye,
  'ti-eye-off': EyeOff,
  'ti-logout': LogOut,
  'ti-lock': Lock,
  'ti-clipboard-list': ClipboardList,
  'ti-circle-check': CheckCircle,
  'ti-loader': Loader,
  'ti-alert-triangle': AlertTriangle,
  'ti-download': Download,
  'ti-edit': Edit,
  'ti-trash': Trash2,
};

interface IconProps {
  name: TablerIconName | string;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className = '' }: IconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon not found: ${name}`);
    return <span className={className}>?</span>;
  }

  return <IconComponent size={size} className={className} />;
}
