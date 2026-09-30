import { useEffect, useState } from "react";
import { QueryClient } from "@tanstack/react-query";

/** Создаёт кеш запросов страницы и отменяет запросы при её размонтировании. */
export function useMessengerQueryClient() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );

  useEffect(
    () => () => {
      void queryClient.cancelQueries();
    },
    [queryClient],
  );

  return queryClient;
}
