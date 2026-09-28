"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { useAppStore } from "@/lib/store";
import { userById } from "@/lib/mock/reference";
import { Avatar } from "@/components/ui/Avatar";
import { roleLabelUk } from "@/lib/permissions";
import { clearAccessToken } from "@/lib/api";

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const pathname = usePathname();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = userById(currentUserId);
  const role = user?.role ?? "employee";

  const items = navItems.filter((item) => !item.roles || item.roles.includes(role));

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
          <Clock3 size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-ink-900">TimeTracker</p>
          <p className="mt-1 text-[11px] text-ink-400">Облік робочого часу</p>
        </div>
        <button className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden" onClick={onCloseMobile}>
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-ink-100 p-3">
          <Link
            href="/login"
            onClick={clearAccessToken}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-ink-100"
          >
            <Avatar name={user.fullName} color={user.avatarColor} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink-800">{user.fullName}</p>
              <p className="truncate text-[11px] text-ink-400">{roleLabel(role)}</p>
            </div>
            <LogOut size={15} className="text-ink-400" />
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white lg:block">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-pop animate-fade-in">{content}</aside>
        </div>
      )}
    </>
  );
}

/** @deprecated використовуйте roleLabelUk з @/lib/permissions — залишено як реекспорт для сумісності. */
export function roleLabel(role: string) {
  return roleLabelUk(role as Parameters<typeof roleLabelUk>[0]);
}
