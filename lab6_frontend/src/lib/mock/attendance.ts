import type { Schedule, TimeEntry } from "@/lib/types";
import { toLocalISODate } from "@/lib/utils";

// Детерміновано генеруємо графіки й фактичні відмітки часу за останні робочі
// дні (без "сьогодні" — поточний день керується живим таймером із zustand-стору,
// а не заздалегідь підготовленими даними). Підхід той самий, що й у seed-даних
// лабораторної роботи №5: формула зсуву від user_id/дня, без Math.random(),
// щоб дашборд виглядав однаково стабільно між перезавантаженнями сторінки.

const DEV_TEAM = [3, 6, 7, 8, 9, 10, 11, 12]; // Бондаренко (керівник) + 7 розробників
const SALES_TEAM = [4, 13, 14, 15];
const ACC_TEAM = [5, 16, 17];

function toISODate(d: Date): string {
  return toLocalISODate(d);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Останні `count` робочих днів ДО сьогодні (не включаючи сьогодні), від старого до нового. */
function pastBusinessDays(count: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1);
  while (out.length < count) {
    if (!isWeekend(cursor)) out.unshift(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return out;
}

/** Наступні `count` робочих днів, ПОЧИНАЮЧИ із сьогодні. */
function upcomingBusinessDays(count: number): Date[] {
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (out.length < count) {
    if (!isWeekend(cursor)) out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

const pastDays = pastBusinessDays(12);
const futureDays = upcomingBusinessDays(6); // включно із сьогодні

let scheduleId = 1;
let entryId = 1;
const schedules: Schedule[] = [];
const timeEntries: TimeEntry[] = [];

function atTime(day: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const PROJECTS_BY_USER: Record<number, number[]> = {
  3: [1, 2, 3],
  6: [1, 2],
  7: [1, 3],
  8: [1, 3],
  9: [1],
  10: [1],
  11: [2],
  12: [2, 4],
};

// ---- Графік (план) для всіх команд: минулі + майбутні дні ----
const allTeams = [...DEV_TEAM, ...SALES_TEAM, ...ACC_TEAM];
[...pastDays, ...futureDays].forEach((day) => {
  allTeams.forEach((userId) => {
    schedules.push({
      id: scheduleId++,
      userId,
      workDate: toISODate(day),
      shiftTemplateId: 2,
      plannedStart: atTime(day, "09:00"),
      plannedEnd: atTime(day, "18:00"),
      status: "confirmed",
    });
  });
});

// ---- Факт (time_entries) лише для минулих днів ----
pastDays.forEach((day, dayIdx) => {
  DEV_TEAM.forEach((userId) => {
    const checkInOffset = ((userId * 3 + dayIdx * 5) % 13) - 10; // -10..+2 хв
    const checkOutOffset = ((userId * 2 + dayIdx * 3) % 17) - 6; // -6..+10 хв
    const checkIn = new Date(atTime(day, "09:00"));
    checkIn.setMinutes(checkIn.getMinutes() + checkInOffset);
    const checkOut = new Date(atTime(day, "18:00"));
    checkOut.setMinutes(checkOut.getMinutes() + checkOutOffset);

    const projList = PROJECTS_BY_USER[userId] ?? [1];
    const projectId = projList[(userId + dayIdx) % projList.length];

    timeEntries.push({
      id: entryId++,
      userId,
      workDate: toISODate(day),
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      status: "completed",
      projectId,
      taskId: null,
      source: "timer",
      createdBy: userId,
    });
  });

  // легші дані для інших відділів (без анотацій-аномалій)
  [...SALES_TEAM, ...ACC_TEAM].forEach((userId) => {
    const checkInOffset = ((userId * 5 + dayIdx * 2) % 11) - 8;
    const checkIn = new Date(atTime(day, "09:00"));
    checkIn.setMinutes(checkIn.getMinutes() + checkInOffset);
    const checkOut = new Date(atTime(day, "18:00"));
    timeEntries.push({
      id: entryId++,
      userId,
      workDate: toISODate(day),
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      status: "completed",
      projectId: null,
      taskId: null,
      source: "timer",
      createdBy: userId,
    });
  });
});

// ---- Навмисні "живі" аномалії на конкретних (відносних) днях ----
function findEntry(userId: number, dayFromEndIndex: number) {
  const day = pastDays[pastDays.length - dayFromEndIndex];
  if (!day) return undefined;
  const iso = toISODate(day);
  return timeEntries.find((e) => e.userId === userId && e.workDate === iso);
}

// 2 робочих дні тому — суттєве запізнення
const late1 = findEntry(7, 2);
if (late1) {
  const d = new Date(late1.checkIn);
  d.setMinutes(d.getMinutes() + 32 - (((7 * 3 + (pastDays.length - 2) * 5) % 13) - 10));
  late1.checkIn = d.toISOString();
}

// 5 робочих днів тому — ще більше запізнення
const late2 = findEntry(10, 5);
if (late2) {
  const d = new Date(late2.checkIn);
  d.setMinutes(d.getMinutes() + 45 - (((10 * 3 + (pastDays.length - 5) * 5) % 13) - 10));
  late2.checkIn = d.toISOString();
}

// 3 робочих дні тому — забутий чекаут
const missing = findEntry(8, 3);
if (missing) {
  missing.checkOut = null;
  missing.status = "missing_checkout";
}

// 6 робочих днів тому — невідмічений прогул (видаляємо факт, графік лишається)
const absentDay = pastDays[pastDays.length - 6];
if (absentDay) {
  const iso = toISODate(absentDay);
  const idx = timeEntries.findIndex((e) => e.userId === 12 && e.workDate === iso);
  if (idx >= 0) timeEntries.splice(idx, 1);
}

// вчора — запис відкоригований керівником вручну (демонстрація canManageTimeEntryFor)
const edited = findEntry(6, 1);
if (edited) {
  edited.status = "edited";
  edited.source = "manual";
  edited.createdBy = 3; // Бондаренко Ігор (керівник) відкоригував запис підлеглого
  edited.note = "Відкориговано керівником: система не зафіксувала чекаут, час встановлено за фактом";
}

// ---- "Сьогодні": кілька колег уже відмітили прихід і працюють просто зараз
// (крім користувача 6 — типового демо-логіна, який сам стартує таймер на
// сторінці /tracker). Це робить дашборд живим одразу після відкриття. ----
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayIso = toISODate(today);
const isTodayBusinessDay = !isWeekend(today);

if (isTodayBusinessDay) {
  const inOfficeNow: { userId: number; checkInHHMM: string; projectId: number | null }[] = [
    { userId: 3, checkInHHMM: "08:47", projectId: 1 },
    { userId: 7, checkInHHMM: "09:05", projectId: 1 },
    { userId: 9, checkInHHMM: "08:58", projectId: 1 },
    { userId: 11, checkInHHMM: "09:12", projectId: 2 },
    { userId: 4, checkInHHMM: "09:00", projectId: null },
  ];
  inOfficeNow.forEach(({ userId, checkInHHMM, projectId }) => {
    timeEntries.push({
      id: entryId++,
      userId,
      workDate: todayIso,
      checkIn: atTime(today, checkInHHMM),
      checkOut: null,
      status: "in_progress",
      projectId,
      taskId: null,
      source: "timer",
      createdBy: userId,
    });
  });
}

export { schedules, timeEntries, pastDays, futureDays, DEV_TEAM, SALES_TEAM, ACC_TEAM };
