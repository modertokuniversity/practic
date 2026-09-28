"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  TimeEntry,
  LeaveRequest,
  AppNotification,
  ProjectTask,
  TaskStatus,
  TaskPriority,
  ReportRecord,
  Project,
} from "@/lib/types";
import { timeEntries as seedTimeEntries } from "@/lib/mock/attendance";
import { leaveRequests as seedLeaveRequests } from "@/lib/mock/leave";
import { notifications as seedNotifications, reports as seedReports } from "@/lib/mock/notifications";
import { tasks as seedTasks, projects as seedProjects } from "@/lib/mock/projects";
import { users as seedUsers } from "@/lib/mock/reference";
import { toLocalISODate } from "@/lib/utils";
import { type TimerSegment, closeLastSegment, summarizeSegments } from "@/lib/timer";
import { apiRequest, getAccessToken } from "@/lib/api";

function syncApi<T>(path: string, method: string, body?: unknown, onSuccess?: (result: T) => void) {
  if (!getAccessToken()) return;
  void apiRequest<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    .then((result) => onSuccess?.(result))
    .catch((error) => console.error(`TimeTracker API ${method} ${path}:`, error));
}

type TimerStatus = "idle" | "work" | "pause" | "lunch";

interface TimerState {
  status: TimerStatus;
  projectId: number | null;
  taskId: number | null;
  note: string;
  segments: TimerSegment[];
}

const IDLE_TIMER: TimerState = { status: "idle", projectId: null, taskId: null, note: "", segments: [] };

interface AppState {
  currentUserId: number;
  setCurrentUser: (id: number) => void;
  hydrateFromApi: () => Promise<void>;

  timer: TimerState;
  startTimer: (projectId: number | null, taskId: number | null, note: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  startLunch: () => void;
  endLunch: () => void;
  stopTimer: () => void;
  discardTimer: () => void;

  timeEntries: TimeEntry[];
  addManualTimeEntry: (entry: Omit<TimeEntry, "id" | "source" | "createdBy">, createdBy: number) => void;
  updateTimeEntry: (id: number, patch: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: number) => void;

  leaveRequests: LeaveRequest[];
  addLeaveRequest: (req: Omit<LeaveRequest, "id" | "status" | "approverId" | "createdAt">) => void;
  decideLeaveRequest: (id: number, status: "approved" | "rejected", approverId: number) => void;

  notifications: AppNotification[];
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: (userId: number) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "isRead">) => void;

  tasks: ProjectTask[];
  setTaskStatus: (id: number, status: TaskStatus) => void;
  setTaskPriority: (id: number, priority: TaskPriority) => void;

  projects: Project[];
  addProject: (p: Omit<Project, "id">) => void;
  updateProject: (id: number, patch: Partial<Project>) => void;

  reports: ReportRecord[];
  addReport: (r: Omit<ReportRecord, "id" | "generatedAt">) => void;

  /** Вартість год. по користувачах — окремо від довідника users.ts, щоб
   * керівник міг призначати ставку в рантаймі (mock-аналог PATCH /users/:id). */
  hourlyRates: Record<number, number>;
  setHourlyRate: (userId: number, rate: number) => void;

  nextEntryId: number;
  nextLeaveId: number;
  nextNotifId: number;
  nextReportId: number;
  nextProjectId: number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUserId: 6,
      setCurrentUser: (id) => set({ currentUserId: id }),
      hydrateFromApi: async () => {
        if (!getAccessToken()) return;
        const [entryResult, leaveRequests, projects, reports, notifications, teamMembers] = await Promise.all([
          apiRequest<{ items: TimeEntry[] }>("/time-entries?page=1&pageSize=200").catch(() => null),
          apiRequest<LeaveRequest[]>("/leave-requests").catch(() => null),
          apiRequest<Project[]>("/projects").catch(() => null),
          apiRequest<Array<ReportRecord & { type: ReportRecord["type"] }>>("/reports").catch(() => null),
          apiRequest<AppNotification[]>("/notifications").catch(() => null),
          apiRequest<Array<{ id: number; hourlyRate: number }>>("/users").catch(() => null),
        ]);
        const projectsNow = projects ?? get().projects;
        const taskResults = await Promise.all(projectsNow.map((p) => apiRequest<ProjectTask[]>(`/projects/${p.id}/tasks`).catch(() => null)));
        const tasks = taskResults.flatMap((result) => result ?? []);
        set({
          ...(entryResult ? { timeEntries: entryResult.items } : {}),
          ...(leaveRequests ? { leaveRequests } : {}),
          ...(projects ? { projects } : {}),
          ...(taskResults.some((result) => result !== null) ? { tasks } : {}),
          ...(reports ? { reports: reports.map((r) => ({ ...r, format: r.format ?? "PDF" })) } : {}),
          ...(notifications ? { notifications } : {}),
          ...(teamMembers ? { hourlyRates: { ...get().hourlyRates, ...Object.fromEntries(teamMembers.map((u) => [u.id, u.hourlyRate])) } } : {}),
        });
      },

      // ---------------- Timer (сегментна модель: work / pause / lunch) ----------------
      timer: IDLE_TIMER,

      startTimer: (projectId, taskId, note) =>
        (set({
          timer: {
            status: "work",
            projectId,
            taskId,
            note,
            segments: [{ type: "work", startedAt: Date.now(), endedAt: null }],
          },
        }), syncApi("/timer/start", "POST", { projectId, taskId, note })),

      pauseTimer: () => {
        const { timer } = get();
        if (timer.status !== "work") return;
        const now = Date.now();
        set({
          timer: {
            ...timer,
            status: "pause",
            segments: [...closeLastSegment(timer.segments, now), { type: "pause", startedAt: now, endedAt: null }],
          },
        });
        syncApi("/timer/pause", "POST");
      },

      resumeTimer: () => {
        const { timer } = get();
        if (timer.status !== "pause") return;
        const now = Date.now();
        set({
          timer: {
            ...timer,
            status: "work",
            segments: [...closeLastSegment(timer.segments, now), { type: "work", startedAt: now, endedAt: null }],
          },
        });
        syncApi("/timer/resume", "POST");
      },

      startLunch: () => {
        const { timer } = get();
        if (timer.status !== "work" && timer.status !== "pause") return;
        const now = Date.now();
        set({
          timer: {
            ...timer,
            status: "lunch",
            segments: [...closeLastSegment(timer.segments, now), { type: "lunch", startedAt: now, endedAt: null }],
          },
        });
        syncApi("/timer/lunch/start", "POST");
      },

      endLunch: () => {
        const { timer } = get();
        if (timer.status !== "lunch") return;
        const now = Date.now();
        set({
          timer: {
            ...timer,
            status: "work",
            segments: [...closeLastSegment(timer.segments, now), { type: "work", startedAt: now, endedAt: null }],
          },
        });
        syncApi("/timer/lunch/end", "POST");
      },

      stopTimer: () => {
        const { timer, currentUserId, nextEntryId } = get();
        if (timer.status === "idle" || timer.segments.length === 0) return;
        const now = Date.now();
        const closedSegments = closeLastSegment(timer.segments, now);
        const totals = summarizeSegments(closedSegments, now);
        const startDate = new Date(closedSegments[0].startedAt);
        const checkIn = startDate.toISOString();
        const checkOut = new Date(now).toISOString();

        const entry: TimeEntry = {
          id: nextEntryId,
          userId: currentUserId,
          workDate: toLocalISODate(startDate),
          checkIn,
          checkOut,
          status: "completed",
          projectId: timer.projectId,
          taskId: timer.taskId,
          note: timer.note || undefined,
          source: "timer",
          createdBy: currentUserId,
          pauseMinutes: Math.round(totals.pauseMs / 60000),
          lunchMinutes: Math.round(totals.lunchMs / 60000),
        };
        set({
          timeEntries: [entry, ...get().timeEntries],
          nextEntryId: nextEntryId + 1,
          timer: IDLE_TIMER,
        });
        syncApi<TimeEntry>("/timer/stop", "POST", undefined, (saved) =>
          set((s) => ({ timeEntries: s.timeEntries.map((item) => item.id === entry.id ? saved : item) }))
        );
      },

      discardTimer: () => set({ timer: IDLE_TIMER }),

      // ---------------- Time entries ----------------
      timeEntries: seedTimeEntries,
      addManualTimeEntry: (entry, createdBy) =>
        (set((s) => ({
          timeEntries: [{ ...entry, id: s.nextEntryId, source: "manual", createdBy }, ...s.timeEntries],
          nextEntryId: s.nextEntryId + 1,
        })), syncApi<TimeEntry>("/time-entries", "POST", { ...entry, userId: entry.userId }, (saved) =>
          set((s) => ({ timeEntries: s.timeEntries.map((item) => item.id === s.nextEntryId - 1 ? saved : item) }))
        )),
      updateTimeEntry: (id, patch) => {
        set((s) => ({ timeEntries: s.timeEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
        syncApi(`/time-entries/${id}`, "PATCH", patch);
      },
      deleteTimeEntry: (id) => {
        set((s) => ({ timeEntries: s.timeEntries.filter((e) => e.id !== id) }));
        syncApi(`/time-entries/${id}`, "DELETE");
      },

      // ---------------- Leave ----------------
      leaveRequests: seedLeaveRequests,
      addLeaveRequest: (req) =>
        (set((s) => ({
          leaveRequests: [
            { ...req, id: s.nextLeaveId, status: "pending", approverId: null, createdAt: new Date().toISOString() },
            ...s.leaveRequests,
          ],
          nextLeaveId: s.nextLeaveId + 1,
        })), syncApi<LeaveRequest>("/leave-requests", "POST", req, (saved) =>
          set((s) => ({ leaveRequests: s.leaveRequests.map((item) => item.id === s.nextLeaveId - 1 ? saved : item) }))
        )),
      decideLeaveRequest: (id, status, approverId) => {
        set((s) => ({ leaveRequests: s.leaveRequests.map((r) => (r.id === id ? { ...r, status, approverId } : r)) }));
        syncApi(`/leave-requests/${id}`, "PATCH", { status });
      },

      // ---------------- Notifications ----------------
      notifications: seedNotifications,
      markNotificationRead: (id) =>
        (set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) })),
          syncApi(`/notifications/${id}?isRead=true`, "PATCH")),
      markAllNotificationsRead: (userId) =>
        (set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, isRead: true } : n)) })),
          get().notifications.filter((n) => n.userId === userId && !n.isRead).forEach((n) => syncApi(`/notifications/${n.id}?isRead=true`, "PATCH"))),
      pushNotification: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: s.nextNotifId, isRead: false, createdAt: new Date().toISOString() }, ...s.notifications],
          nextNotifId: s.nextNotifId + 1,
        })),

      // ---------------- Tasks ----------------
      tasks: seedTasks,
      setTaskStatus: (id, status) => {
        set((s) => ({ tasks: s.tasks.map((tk) => (tk.id === id ? { ...tk, status } : tk)) }));
        syncApi(`/tasks/${id}/status`, "PATCH", { status });
      },
      setTaskPriority: (id, priority) => {
        set((s) => ({ tasks: s.tasks.map((tk) => (tk.id === id ? { ...tk, priority } : tk)) }));
        syncApi(`/tasks/${id}/priority`, "PATCH", { priority });
      },

      // ---------------- Projects ----------------
      projects: seedProjects,
      addProject: (p) =>
        (set((s) => ({ projects: [{ ...p, id: s.nextProjectId }, ...s.projects], nextProjectId: s.nextProjectId + 1 })),
          syncApi<Project>("/projects", "POST", p, (saved) => set((s) => ({ projects: s.projects.map((project) => project.id === s.nextProjectId - 1 ? saved : project) })))),
      updateProject: (id, patch) => {
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        syncApi(`/projects/${id}`, "PATCH", patch);
      },

      // ---------------- Reports ----------------
      reports: seedReports,
      addReport: (r) =>
        (set((s) => ({
          reports: [{ ...r, id: s.nextReportId, generatedAt: new Date().toISOString() }, ...s.reports],
          nextReportId: s.nextReportId + 1,
        })), syncApi<ReportRecord>("/reports", "POST", { reportType: r.type, periodStart: r.periodStart, periodEnd: r.periodEnd, departmentId: r.departmentId }, (saved) =>
          set((s) => ({ reports: s.reports.map((item) => item.id === s.nextReportId - 1 ? { ...item, ...saved } : item) }))
        )),

      hourlyRates: Object.fromEntries(seedUsers.map((u) => [u.id, u.hourlyRate])),
      setHourlyRate: (userId, rate) => {
        set((s) => ({ hourlyRates: { ...s.hourlyRates, [userId]: rate } }));
        syncApi(`/users/${userId}/hourly-rate`, "PATCH", { rate });
      },

      nextEntryId: Math.max(...seedTimeEntries.map((e) => e.id), 0) + 1,
      nextLeaveId: Math.max(...seedLeaveRequests.map((r) => r.id), 0) + 1,
      nextNotifId: Math.max(...seedNotifications.map((n) => n.id), 0) + 1,
      nextReportId: Math.max(...seedReports.map((r) => r.id), 0) + 1,
      nextProjectId: Math.max(...seedProjects.map((p) => p.id), 0) + 1,
    }),
    {
      name: "timetracker-store-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
