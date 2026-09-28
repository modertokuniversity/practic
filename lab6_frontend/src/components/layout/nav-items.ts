import {
  LayoutDashboard,
  Timer,
  ClipboardList,
  FolderKanban,
  CalendarDays,
  Plane,
  Users,
  BarChart3,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[]; // якщо не вказано — доступно всім ролям
}

export const navItems: NavItem[] = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/tracker", label: "Таймер", icon: Timer },
  { href: "/timesheet", label: "Табель", icon: ClipboardList },
  { href: "/projects", label: "Проєкти", icon: FolderKanban },
  { href: "/schedule", label: "Графік змін", icon: CalendarDays },
  { href: "/leave", label: "Відпустки", icon: Plane },
  { href: "/team", label: "Команда", icon: Users, roles: ["manager", "hr_admin", "admin"] },
  { href: "/reports", label: "Звіти й аналітика", icon: BarChart3, roles: ["manager", "hr_admin", "admin"] },
  { href: "/payroll", label: "Оплата праці", icon: Wallet, roles: ["accountant", "manager", "admin"] },
  { href: "/settings", label: "Налаштування", icon: Settings },
];
