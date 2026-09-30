import { Alert, Spin } from "antd";
import {
  type useGreenApiSession,
  GREEN_API_SESSION_ERROR_MESSAGES,
} from "@/features/green-api-session";
import { GreenApiSessionPage } from "@/pages/green-api-session";
import { errorText } from "@/shared/lib/errorText";
import { useTranslation } from "@/shared/i18n";
import { MessengerRoot } from "./MessengerRoot";

type AppContentProps = {
  session: ReturnType<typeof useGreenApiSession>;
};

export function AppContent({ session }: AppContentProps) {
  const { t } = useTranslation("ui");
  const { credentials, client, verification, acceptVerifiedSession } = session;

  if (!credentials || !client)
    return <GreenApiSessionPage onReady={acceptVerifiedSession} />;

  if (!verification) return <Spin description={t("app.verifying")} />;

  if (verification.status === "error")
    return (
      <Alert
        type="error"
        title={errorText(
          verification.error,
          GREEN_API_SESSION_ERROR_MESSAGES.verificationFailed,
        )}
      />
    );

  return (
    <MessengerRoot
      key={`${credentials.apiUrl}:${credentials.instanceId}`}
      client={client}
    />
  );
}
