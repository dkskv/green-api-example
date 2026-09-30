import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  GreenApiSessionForm,
  type GreenApiCredentials,
} from "@/features/green-api-session";

type GreenApiSessionPageProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function GreenApiSessionPage({ onReady }: GreenApiSessionPageProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <GreenApiSessionForm onReady={onReady} />
    </QueryClientProvider>
  );
}
