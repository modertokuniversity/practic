import type { Department, Position, ShiftTemplate, LeaveType, Holiday, User } from "@/lib/types";

export const departments: Department[] = [
  { id: 1, name: "Відділ розробки", managerId: 3, color: "#7C3AED" },
  { id: 2, name: "Відділ продажів", managerId: 4, color: "#0EA5E9" },
  { id: 3, name: "Бухгалтерія", managerId: 5, color: "#F59E0B" },
  { id: 4, name: "HR-відділ", managerId: 2, color: "#10B981" },
];

export const positions: Position[] = [
  { id: 1, title: "Керівник відділу" },
  { id: 2, title: "Розробник ПЗ" },
  { id: 3, title: "QA-інженер" },
  { id: 4, title: "Менеджер з продажів" },
  { id: 5, title: "Бухгалтер" },
  { id: 6, title: "HR-менеджер" },
  { id: 7, title: "Системний адміністратор" },
];

export const shiftTemplates: ShiftTemplate[] = [
  { id: 1, name: "Ранкова", startTime: "07:00", endTime: "15:00", breakMinutes: 30 },
  { id: 2, name: "Денна", startTime: "09:00", endTime: "18:00", breakMinutes: 60 },
  { id: 3, name: "Нічна", startTime: "22:00", endTime: "06:00", breakMinutes: 30 },
];

export const leaveTypes: LeaveType[] = [
  { id: 1, name: "Щорічна відпустка", isPaid: true, annualLimitDays: 24, color: "#7C3AED" },
  { id: 2, name: "Лікарняний", isPaid: true, annualLimitDays: null, color: "#EF4444" },
  { id: 3, name: "Відгул за власний рахунок", isPaid: false, annualLimitDays: 15, color: "#F59E0B" },
  { id: 4, name: "Відрядження", isPaid: true, annualLimitDays: null, color: "#0EA5E9" },
];

const year = new Date().getFullYear();
export const holidays: Holiday[] = [
  { id: 1, name: "Новий рік", date: `${year}-01-01` },
  { id: 2, name: "Різдво Христове", date: `${year}-01-07` },
  { id: 3, name: "Міжнародний жіночий день", date: `${year}-03-08` },
  { id: 4, name: "День праці", date: `${year}-05-01` },
  { id: 5, name: "День перемоги над нацизмом", date: `${year}-05-08` },
  { id: 6, name: "День Конституції України", date: `${year}-06-28` },
  { id: 7, name: "День Незалежності України", date: `${year}-08-24` },
  { id: 8, name: "День захисників і захисниць України", date: `${year}-10-01` },
  { id: 9, name: "Різдво (за григоріанським календарем)", date: `${year}-12-25` },
];

const AVATAR_COLORS = ["#7C3AED", "#0EA5E9", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#6366F1", "#14B8A6"];
function colorFor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export const users: User[] = [
  { id: 1, fullName: "Ковальчук Олег Ігорович", email: "admin@timetrack.local", role: "admin", departmentId: null, positionId: 7, avatarColor: colorFor(1), isActive: true, hireDate: "2022-01-10", hourlyRate: 320 },
  { id: 2, fullName: "Мельник Оксана Петрівна", email: "hr@timetrack.local", role: "hr_admin", departmentId: 4, positionId: 6, avatarColor: colorFor(2), isActive: true, hireDate: "2022-02-01", hourlyRate: 260 },
  { id: 3, fullName: "Бондаренко Ігор Васильович", email: "i.bondarenko@timetrack.local", role: "manager", departmentId: 1, positionId: 1, avatarColor: colorFor(3), isActive: true, hireDate: "2022-01-15", hourlyRate: 450 },
  { id: 4, fullName: "Шевченко Марія Олексіївна", email: "m.shevchenko@timetrack.local", role: "manager", departmentId: 2, positionId: 1, avatarColor: colorFor(4), isActive: true, hireDate: "2022-03-01", hourlyRate: 380 },
  { id: 5, fullName: "Ткаченко Наталія Богданівна", email: "n.tkachenko@timetrack.local", role: "manager", departmentId: 3, positionId: 1, avatarColor: colorFor(5), isActive: true, hireDate: "2022-01-20", hourlyRate: 350 },
  { id: 6, fullName: "Гнатишак Андрій Йосипович", email: "a.hnatyshak@timetrack.local", role: "employee", departmentId: 1, positionId: 2, avatarColor: colorFor(6), isActive: true, hireDate: "2023-06-01", hourlyRate: 320 },
  { id: 7, fullName: "Кравець Тарас Миколайович", email: "t.kravets@timetrack.local", role: "employee", departmentId: 1, positionId: 2, avatarColor: colorFor(7), isActive: true, hireDate: "2023-02-15", hourlyRate: 300 },
  { id: 8, fullName: "Іванов Дмитро Сергійович", email: "d.ivanov@timetrack.local", role: "employee", departmentId: 1, positionId: 2, avatarColor: colorFor(8), isActive: true, hireDate: "2023-09-01", hourlyRate: 280 },
  { id: 9, fullName: "Поліщук Софія Андріївна", email: "s.polishchuk@timetrack.local", role: "employee", departmentId: 1, positionId: 3, avatarColor: colorFor(9), isActive: true, hireDate: "2024-01-10", hourlyRate: 240 },
  { id: 10, fullName: "Демченко Юлія Романівна", email: "y.demchenko@timetrack.local", role: "employee", departmentId: 1, positionId: 3, avatarColor: colorFor(10), isActive: true, hireDate: "2024-03-15", hourlyRate: 220 },
  { id: 11, fullName: "Савчук Роман Олегович", email: "r.savchuk@timetrack.local", role: "employee", departmentId: 1, positionId: 2, avatarColor: colorFor(11), isActive: true, hireDate: "2023-11-01", hourlyRate: 310 },
  { id: 12, fullName: "Лисенко Вікторія Ігорівна", email: "v.lysenko@timetrack.local", role: "employee", departmentId: 1, positionId: 2, avatarColor: colorFor(12), isActive: true, hireDate: "2024-05-20", hourlyRate: 260 },
  { id: 13, fullName: "Гринько Максим Андрійович", email: "m.hrynko@timetrack.local", role: "employee", departmentId: 2, positionId: 4, avatarColor: colorFor(13), isActive: true, hireDate: "2023-04-01", hourlyRate: 220 },
  { id: 14, fullName: "Олійник Катерина Василівна", email: "k.oliynyk@timetrack.local", role: "employee", departmentId: 2, positionId: 4, avatarColor: colorFor(14), isActive: true, hireDate: "2023-07-15", hourlyRate: 210 },
  { id: 15, fullName: "Мороз Павло Дмитрович", email: "p.moroz@timetrack.local", role: "employee", departmentId: 2, positionId: 4, avatarColor: colorFor(15), isActive: true, hireDate: "2024-02-01", hourlyRate: 200 },
  { id: 16, fullName: "Захарченко Ольга Тарасівна", email: "o.zakharchenko@timetrack.local", role: "accountant", departmentId: 3, positionId: 5, avatarColor: colorFor(16), isActive: true, hireDate: "2022-11-10", hourlyRate: 260 },
  { id: 17, fullName: "Кузьменко Павло Ігорович", email: "p.kuzmenko@timetrack.local", role: "employee", departmentId: 3, positionId: 5, avatarColor: colorFor(17), isActive: true, hireDate: "2023-08-01", hourlyRate: 230 },
  { id: 18, fullName: "Романюк Софія Юріївна", email: "s.romanyuk@timetrack.local", role: "employee", departmentId: 4, positionId: 6, avatarColor: colorFor(18), isActive: false, hireDate: "2024-04-01", hourlyRate: 200 },
];

export function userById(id: number | null): User | undefined {
  if (id === null) return undefined;
  return users.find((u) => u.id === id);
}
export function departmentById(id: number | null): Department | undefined {
  if (id === null) return undefined;
  return departments.find((d) => d.id === id);
}
export function positionById(id: number | null): Position | undefined {
  if (id === null) return undefined;
  return positions.find((p) => p.id === id);
}
