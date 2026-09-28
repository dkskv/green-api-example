import { SessionForm } from "@/features/session";
import { type GreenApiCredentials } from "@/shared/api/green-api/types";

type SessionPageProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function SessionPage({ onReady }: SessionPageProps) {
  return <SessionForm onReady={onReady} />;
}
