"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, Input, Label, FormRow, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/lib/store";
import type { TimeEntry } from "@/lib/types";
import { toLocalISODate } from "@/lib/utils";

export interface TimeEntryFormValues {
  workDate: string;
  checkIn: string; // ISO
  checkOut: string; // ISO
  projectId: number | null;
  note: string;
}

export function TimeEntryFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title = "Додати запис часу",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TimeEntryFormValues) => void;
  initial?: TimeEntry | null;
  title?: string;
}) {
  const projects = useAppStore((s) => s.projects);
  const today = toLocalISODate(new Date());
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [projectId, setProjectId] = useState<number | "">(projects[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initial) {
        setDate(initial.workDate);
        setStart(new Date(initial.checkIn).toTimeString().slice(0, 5));
        setEnd(initial.checkOut ? new Date(initial.checkOut).toTimeString().slice(0, 5) : "18:00");
        setProjectId(initial.projectId ?? "");
        setNote(initial.note ?? "");
      } else {
        setDate(today);
        setStart("09:00");
        setEnd("18:00");
        setProjectId(projects[0]?.id ?? "");
        setNote("");
      }
      setError("");
    }
  }, [open, initial, today]);

  function handleSubmit() {
    if (!date) {
      setError("Оберіть дату");
      return;
    }
    if (start >= end) {
      setError("Час завершення має бути пізніше за час початку");
      return;
    }
    onSubmit({
      workDate: date,
      checkIn: new Date(`${date}T${start}:00`).toISOString(),
      checkOut: new Date(`${date}T${end}:00`).toISOString(),
      projectId: projectId ? Number(projectId) : null,
      note,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit}>Зберегти</Button>
        </>
      }
    >
      <FormRow>
        <Label>Дата</Label>
        <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow>
          <Label>Початок</Label>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </FormRow>
        <FormRow>
          <Label>Завершення</Label>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </FormRow>
      </div>
      <FormRow>
        <Label>Проєкт</Label>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— Без проєкту —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </FormRow>
      <FormRow>
        <Label>Нотатка</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Опис виконаної роботи" />
      </FormRow>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </Modal>
  );
}
