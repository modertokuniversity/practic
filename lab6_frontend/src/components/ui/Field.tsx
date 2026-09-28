"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-ink-600">{children}</label>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
