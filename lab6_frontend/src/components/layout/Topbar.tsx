"use client";

import { Menu, Search } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { MiniTimerPill } from "@/components/timer/MiniTimerPill";

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/80 px-4 backdrop-blur sm:px-6">
      <button
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
        onClick={onOpenMobile}
        aria-label="Меню"
      >
        <Menu size={20} />
      </button>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          placeholder="Пошук проєктів, задач, людей…"
          className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-700 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <MiniTimerPill />
        <NotificationsDropdown />
        <RoleSwitcher />
      </div>
    </header>
  );
}
