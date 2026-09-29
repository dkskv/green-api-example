import { SessionForm } from "@/features/messenger-session";
import { type GreenApiCredentials } from "@/integrations/green-api";

type SessionPageProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function SessionPage({ onReady }: SessionPageProps) {
  return <SessionForm onReady={onReady} />;
}
