"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

/**
 * zustand/persist налаштовано з skipHydration: true, щоб перший рендер на
 * сервері й клієнті збігався (уникаємо React hydration mismatch). Тут ми
 * вручну "доганяємо" стан із localStorage вже після монтування.
 */
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useAppStore.persist.rehydrate();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return <>{children}</>;
}
