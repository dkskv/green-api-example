import {
  GreenApiSessionForm,
  type GreenApiCredentials,
} from "@/features/green-api-session";

type GreenApiSessionPageProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function GreenApiSessionPage({ onReady }: GreenApiSessionPageProps) {
  return <GreenApiSessionForm onReady={onReady} />;
}
