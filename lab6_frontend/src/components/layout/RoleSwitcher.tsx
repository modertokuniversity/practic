"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById } from "@/lib/mock/reference";
import { Avatar } from "@/components/ui/Avatar";
import { roleLabel } from "./Sidebar";
import { getAccessToken } from "@/lib/api";

const DEMO_USER_IDS = [6, 3, 2, 1, 16]; // employee, manager, hr_admin, admin, accountant

export function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const user = userById(currentUserId);
  const authenticated = Boolean(getAccessToken());

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !authenticated && setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-2.5 hover:bg-ink-50"
      >
        <Avatar name={user.fullName} color={user.avatarColor} size={26} />
        <div className="hidden text-left sm:block">
          <p className="text-xs font-semibold leading-none text-ink-800">{user.fullName.split(" ")[0]}</p>
          <p className="mt-0.5 text-[10px] text-ink-400">{roleLabel(user.role)}</p>
        </div>
        {!authenticated && <ChevronDown size={14} className="text-ink-400" />}
      </button>

      {open && !authenticated && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop animate-fade-in">
          <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
            Демо-режим · перемкнути роль
          </p>
          {DEMO_USER_IDS.map((id) => {
            const u = userById(id)!;
            const active = id === currentUserId;
            return (
              <button
                key={id}
                onClick={() => {
                  setCurrentUser(id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
              >
                <Avatar name={u.fullName} color={u.avatarColor} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-800">{u.fullName}</p>
                  <p className="truncate text-[11px] text-ink-400">{roleLabel(u.role)}</p>
                </div>
                {active && <Check size={15} className="text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
