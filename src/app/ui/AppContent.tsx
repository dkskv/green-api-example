import { Alert, Spin } from "antd";
import { type useGreenApiSession } from "@/features/green-api-session";
import { GreenApiSessionPage } from "@/pages/green-api-session";
import { errorText } from "@/shared/ui/errorText";
import { useTranslation } from "@/shared/i18n";
import { MessengerPage } from "@/pages/messenger";

type AppContentProps = {
  session: ReturnType<typeof useGreenApiSession>;
};

export function AppContent({ session }: AppContentProps) {
  const { t } = useTranslation(["ui", "errors"]);
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
          t("errors:session.verificationFailed"),
        )}
      />
    );

  return (
    <MessengerPage
      key={`${credentials.apiUrl}:${credentials.instanceId}`}
      client={client}
    />
  );
}
