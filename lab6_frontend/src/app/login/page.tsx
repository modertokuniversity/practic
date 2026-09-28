"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Timer, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { users } from "@/lib/mock/reference";
import { Button } from "@/components/ui/Button";
import { Input, Label, FormRow } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { roleLabel } from "@/components/layout/Sidebar";
import { signIn } from "@/lib/api";

const DEMO_IDS = [6, 3, 2, 1, 16];

export default function LoginPage() {
  const router = useRouter();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [email, setEmail] = useState("a.hnatyshak@timetrack.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await signIn(email, password);
      setCurrentUser(user.id);
      await useAppStore.getState().hydrateFromApi();
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося увійти. Перевірте дані та доступність API.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand / hero side */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Clock3 size={18} />
          </div>
          <span className="text-lg font-semibold">TimeTracker</span>
        </div>

        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Облік робочого часу, який ваша команда дійсно любить використовувати
          </h1>
          <p className="mt-4 max-w-sm text-sm text-brand-100">
            Таймер, проєкти, графіки змін, відпустки та аналітика — все в одному сучасному застосунку.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <Feature icon={Timer} title="Таймер у реальному часі" />
            <Feature icon={CalendarCheck} title="Графіки та відпустки" />
            <Feature icon={BarChart3} title="Аналітика й звіти" />
            <Feature icon={Clock3} title="Історія та аудит" />
          </div>
        </div>

        <p className="text-xs text-brand-200">© {new Date().getFullYear()} TimeTracker · навчальний проєкт</p>

        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Form side */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Clock3 size={18} />
            </div>
            <span className="text-lg font-semibold text-ink-900">TimeTracker</span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900">Вхід у систему</h2>
          <p className="mt-1 text-sm text-ink-500">Увійдіть за обліковими даними TimeTracker.</p>

          <form onSubmit={handleLogin} className="mt-6">
            <FormRow>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormRow>
            <FormRow>
              <Label>Пароль</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required />
            </FormRow>
            {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Перевіряємо…" : <>Увійти <ArrowRight size={16} /></>}
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-400">Швидкий вхід (демо-акаунти)</p>
            <div className="space-y-2">
              {DEMO_IDS.map((id) => {
                const u = users.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setEmail(u.email); setPassword("ChangeMe123!"); setError(""); }}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-ink-200 px-3 py-2 text-left hover:bg-ink-50"
                  >
                    <Avatar name={u.fullName} color={u.avatarColor} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink-800">{u.fullName}</p>
                      <p className="text-[11px] text-ink-400">{roleLabel(u.role)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title }: { icon: typeof Timer; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-brand-50">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
        <Icon size={15} />
      </div>
      {title}
    </div>
  );
}
