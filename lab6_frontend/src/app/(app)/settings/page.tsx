"use client";

import { useState } from "react";
import { Save, Bell, Globe, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { userById, departmentById, positionById } from "@/lib/mock/reference";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormRow, Select } from "@/components/ui/Field";
import { SectionHeading } from "@/components/ui/Misc";
import { roleLabel } from "@/components/layout/Sidebar";

export default function SettingsPage() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const user = userById(currentUserId)!;
  const [saved, setSaved] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [language, setLanguage] = useState("uk");

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeading title="Налаштування" subtitle="Профіль та параметри застосунку" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Профіль</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={user.fullName} color={user.avatarColor} size={64} />
              <div>
                <p className="text-base font-semibold text-ink-900">{user.fullName}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{roleLabel(user.role)}</Badge>
                  {departmentById(user.departmentId) && <Badge tone="gray">{departmentById(user.departmentId)?.name}</Badge>}
                  {positionById(user.positionId) && <Badge tone="gray">{positionById(user.positionId)?.title}</Badge>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label>Повне ім&apos;я</Label>
                <Input defaultValue={user.fullName} />
              </FormRow>
              <FormRow>
                <Label>Email</Label>
                <Input defaultValue={user.email} type="email" />
              </FormRow>
              <FormRow>
                <Label>Дата прийняття на роботу</Label>
                <Input defaultValue={user.hireDate} type="date" disabled />
              </FormRow>
              <FormRow>
                <Label>Мова інтерфейсу</Label>
                <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="uk">Українська</option>
                  <option value="en">English</option>
                </Select>
              </FormRow>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сповіщення</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4 pt-2">
            <ToggleRow icon={Bell} label="Email-сповіщення" description="Отримувати листи про статус заявок і графік" checked={emailNotif} onChange={setEmailNotif} />
            <ToggleRow icon={Globe} label="Push-сповіщення в застосунку" description="Показувати сповіщення про запізнення та новини команди" checked={pushNotif} onChange={setPushNotif} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Безпека</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-4">
              <Shield size={18} className="text-ink-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-700">Пароль</p>
                <p className="text-xs text-ink-400">Востаннє змінено — демо-режим, автентифікація умовна</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Змінити
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={save}>
            <Save size={15} /> Зберегти зміни
          </Button>
          {saved && <span className="text-xs font-medium text-emerald-600">Збережено ✓</span>}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-ink-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-ink-700">{label}</p>
        <p className="text-xs text-ink-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand-600" : "bg-ink-200"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
