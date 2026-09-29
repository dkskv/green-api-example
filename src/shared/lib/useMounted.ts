import { useEffect, useState } from "react";

/** Разрешает загрузку после проверочного цикла mount → cleanup → mount в StrictMode. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (active) setMounted(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return mounted;
}
