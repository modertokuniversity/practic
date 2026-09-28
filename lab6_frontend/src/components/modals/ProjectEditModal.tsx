"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, Input, Label, FormRow, Textarea } from "@/components/ui/Field";
import { users, departments } from "@/lib/mock/reference";
import { useAppStore } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";

const COLORS = ["#7C3AED", "#0EA5E9", "#F59E0B", "#EC4899", "#10B981", "#6366F1", "#14B8A6", "#F97316", "#DB2777", "#059669", "#0891B2", "#8B5CF6"];

/**
 * Створення й редагування проєкту — саме тут реалізована вимога
 * "керівник обирає, хто над яким проєктом працює": memberIds призначаються
 * прапорцями, leadId — окремим селектом (технічно відповідальна особа,
 * яка тоді отримує право на ручні записи часу по цьому проєкту).
 */
export function ProjectEditModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}) {
  const addProject = useAppStore((s) => s.addProject);
  const updateProject = useAppStore((s) => s.updateProject);

  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [departmentId, setDepartmentId] = useState<number>(departments[0]?.id ?? 1);
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [budgetHours, setBudgetHours] = useState(100);
  const [leadId, setLeadId] = useState<number>(users[0]?.id ?? 1);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!open) return;
    if (project) {
      setName(project.name);
      setClientName(project.clientName);
      setDepartmentId(project.departmentId);
      setStatus(project.status);
      setBudgetHours(project.budgetHours);
      setLeadId(project.leadId);
      setMemberIds(project.memberIds);
      setColor(project.color);
      setDescription(project.description);
      setDeadline(project.deadline ?? "");
    } else {
      setName("");
      setClientName("");
      setDepartmentId(departments[0]?.id ?? 1);
      setStatus("planning");
      setBudgetHours(100);
      setLeadId(users[0]?.id ?? 1);
      setMemberIds([]);
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setDescription("");
      setDeadline("");
    }
  }, [open, project]);

  function toggleMember(id: number) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!name.trim()) return;
    const finalMembers = memberIds.includes(leadId) ? memberIds : [...memberIds, leadId];
    const payload = {
      name: name.trim(),
      clientName: clientName.trim() || "Внутрішній проєкт",
      color,
      status,
      departmentId,
      budgetHours,
      leadId,
      memberIds: finalMembers,
      startDate: project?.startDate ?? new Date().toISOString().slice(0, 10),
      deadline: deadline || null,
      description: description.trim(),
    };
    if (project) updateProject(project.id, payload);
    else addProject(payload);
    onClose();
  }

  const deptUsers = users.filter((u) => u.departmentId === departmentId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Редагувати проєкт" : "Новий проєкт"}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit}>Зберегти</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormRow>
          <Label>Назва проєкту</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. Мобільний застосунок" />
        </FormRow>
        <FormRow>
          <Label>Клієнт</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Внутрішній проєкт" />
        </FormRow>
        <FormRow>
          <Label>Підрозділ</Label>
          <Select value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value))}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow>
          <Label>Статус</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="planning">Планування</option>
            <option value="active">Активний</option>
            <option value="on_hold">На паузі</option>
            <option value="completed">Завершено</option>
          </Select>
        </FormRow>
        <FormRow>
          <Label>Бюджет годин</Label>
          <Input type="number" min={1} value={budgetHours} onChange={(e) => setBudgetHours(Number(e.target.value))} />
        </FormRow>
        <FormRow>
          <Label>Дедлайн (необов&apos;язково)</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>Відповідальний (лід проєкту)</Label>
          <Select value={leadId} onChange={(e) => setLeadId(Number(e.target.value))}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow>
          <Label>Колір мітки</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full ring-offset-2"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </FormRow>
      </div>

      <FormRow>
        <Label>Опис</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Короткий опис проєкту" />
      </FormRow>

      <FormRow>
        <Label>Учасники ({deptUsers.length} у підрозділі)</Label>
        <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-ink-200 p-2">
          {deptUsers.map((u) => (
            <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-ink-50">
              <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} className="rounded border-ink-300" />
              <span className="truncate text-ink-700">{u.fullName}</span>
            </label>
          ))}
        </div>
      </FormRow>
    </Modal>
  );
}
