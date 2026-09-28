"use client";

import { useEffect, useState } from "react";

/** Повертає значення, що оновлюється кожну секунду — для живих таймерів. */
export function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}
