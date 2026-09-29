import {
  SessionForm,
  type GreenApiCredentials,
} from "@/features/messenger-session";

type SessionPageProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function SessionPage({ onReady }: SessionPageProps) {
  return <SessionForm onReady={onReady} />;
}
