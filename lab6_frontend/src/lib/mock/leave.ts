import type { LeaveRequest, LeaveBalance } from "@/lib/types";
import { toLocalISODate } from "@/lib/utils";
import { users } from "./reference";

function rel(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}
function relDateTime(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const leaveRequests: LeaveRequest[] = [
  { id: 1, userId: 6, leaveTypeId: 1, startDate: rel(12), endDate: rel(16), reason: "Щорічна відпустка", status: "approved", approverId: 3, createdAt: relDateTime(-3) },
  { id: 2, userId: 7, leaveTypeId: 2, startDate: rel(-3), endDate: rel(-2), reason: "Погане самопочуття", status: "approved", approverId: 3, createdAt: relDateTime(-3) },
  { id: 3, userId: 9, leaveTypeId: 1, startDate: rel(25), endDate: rel(36), reason: "Щорічна відпустка (2 тижні)", status: "pending", approverId: null, createdAt: relDateTime(-1) },
  { id: 4, userId: 11, leaveTypeId: 3, startDate: rel(4), endDate: rel(4), reason: "Особисті справи", status: "pending", approverId: null, createdAt: relDateTime(0) },
  { id: 5, userId: 13, leaveTypeId: 1, startDate: rel(3), endDate: rel(7), reason: "Відпустка", status: "rejected", approverId: 4, createdAt: relDateTime(-4) },
  { id: 6, userId: 16, leaveTypeId: 4, startDate: rel(11), endDate: rel(12), reason: "Відрядження до клієнта (Львів)", status: "approved", approverId: 5, createdAt: relDateTime(-2) },
  { id: 7, userId: 12, leaveTypeId: 2, startDate: rel(-6), endDate: rel(-6), reason: "Лікарняний", status: "approved", approverId: 3, createdAt: relDateTime(-7) },
  { id: 8, userId: 8, leaveTypeId: 3, startDate: rel(8), endDate: rel(8), reason: "Відгул", status: "pending", approverId: null, createdAt: relDateTime(0) },
];

export const leaveBalances: LeaveBalance[] = users
  .filter((u) => u.isActive && (u.role === "employee" || u.role === "manager"))
  .flatMap((u) => [
    { userId: u.id, leaveTypeId: 1, year: new Date().getFullYear(), totalDays: 24, usedDays: u.id === 6 ? 5 : u.id === 7 ? 2 : 0 },
    { userId: u.id, leaveTypeId: 3, year: new Date().getFullYear(), totalDays: 15, usedDays: u.id === 11 ? 3 : 0 },
  ]);

export function leaveBalanceFor(userId: number) {
  return leaveBalances.filter((b) => b.userId === userId);
}
