import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessengerPage } from "@/pages/messenger";
import { type ChatClient } from "@/entities/chat";

export function MessengerSession({ client }: { client: ChatClient }) {
  // A new authenticated session gets its own history and mutation cache.
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
