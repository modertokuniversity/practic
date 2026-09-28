import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Локальна календарна дата у форматі YYYY-MM-DD БЕЗ конвертації в UTC.
 * `date.toISOString().slice(0,10)` небезпечний: він переводить час у UTC,
 * тож для часових поясів з позитивним зсувом (напр. Europe/Kyiv, UTC+3)
 * північ за місцевим часом потрапляє на ПОПЕРЕДНЮ календарну добу в UTC —
 * усі дати "з'їжджають" на день назад. Цю функцію слід використовувати
 * всюди, де потрібен саме локальний календарний день.
 */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function minutesToHm(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}хв`;
  if (m === 0) return `${h}год`;
  return `${h}год ${m}хв`;
}

export function secondsToClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("uk-UA", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

export function formatWeekday(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("uk-UA", { weekday: "short" });
}
