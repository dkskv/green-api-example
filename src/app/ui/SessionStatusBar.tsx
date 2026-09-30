import { Button, Space, Tag } from "antd";
import type { VerificationResult } from "@/features/green-api-session";
import { useTranslation } from "@/shared/i18n";

type SessionStatusBarProps = {
  instanceId: string;
  status: VerificationResult["status"] | undefined;
  onSignOut: () => void;
};

export function SessionStatusBar({
  instanceId,
  status,
  onSignOut,
}: SessionStatusBarProps) {
  const { t } = useTranslation("ui");

  return (
    <Space>
      <Tag>{t("app.instance", { id: instanceId })}</Tag>
      <Tag>
        {status === "success"
          ? t("app.sessionActive")
          : t("app.sessionUnverified")}
      </Tag>
      <Button onClick={onSignOut}>{t("app.signOut")}</Button>
    </Space>
  );
}
