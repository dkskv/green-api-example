import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessengerPage } from "@/pages/messenger";
import { type ChatClient } from "@/entities/chat";

export function MessengerSession({ client }: { client: ChatClient }) {
  // Каждая сессия получает отдельный кеш истории и мутаций.
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

  return (
    <QueryClientProvider client={queryClient}>
      <MessengerPage client={client} />
    </QueryClientProvider>
  );
}
