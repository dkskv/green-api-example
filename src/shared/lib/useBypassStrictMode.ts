import { useEffect, useState } from "react";

/** Откладывает запросы до конца проверочного цикла StrictMode; в production сразу возвращает true. */
export function useBypassStrictMode() {
  const [ready, setReady] = useState(import.meta.env.PROD);

  useEffect(() => {
    if (import.meta.env.PROD) return;

    let active = true;

    queueMicrotask(() => {
      if (active) setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return ready;
}
