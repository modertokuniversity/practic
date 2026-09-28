// Сегментна модель таймера: один "сеанс" (від "Розпочати" до "Завершити")
// складається з послідовності сегментів різного типу (робота / пауза / обід).
// Це дозволяє показувати "робочий час, паузи та обід окремо" — вимога
// лаб. роботи №6-7 — і водночас зберігати єдиний TimeEntry по завершенні.

export type SegmentType = "work" | "pause" | "lunch";

export interface TimerSegment {
  type: SegmentType;
  startedAt: number; // epoch ms
  endedAt: number | null; // null → сегмент ще триває
}

export interface TimerTotals {
  workMs: number;
  pauseMs: number;
  lunchMs: number;
}

/** Рахує сумарну тривалість кожного типу сегмента, враховуючи, що останній
 * сегмент може бути ще відкритим (endedAt === null) — тоді рахуємо до `now`. */
export function summarizeSegments(segments: TimerSegment[], now: number = Date.now()): TimerTotals {
  const totals: TimerTotals = { workMs: 0, pauseMs: 0, lunchMs: 0 };
  for (const seg of segments) {
    const end = seg.endedAt ?? now;
    const dur = Math.max(0, end - seg.startedAt);
    if (seg.type === "work") totals.workMs += dur;
    else if (seg.type === "pause") totals.pauseMs += dur;
    else totals.lunchMs += dur;
  }
  return totals;
}

export function closeLastSegment(segments: TimerSegment[], at: number): TimerSegment[] {
  if (segments.length === 0) return segments;
  const copy = segments.slice();
  const last = { ...copy[copy.length - 1] };
  if (last.endedAt === null) last.endedAt = at;
  copy[copy.length - 1] = last;
  return copy;
}
