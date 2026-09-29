import { z } from "zod";
import { useEffect } from "react";
import { errorText } from "@/shared/i18n/text";
import { useDisplayText } from "@/shared/i18n/useDisplayText";
import { useTranslation } from "@/shared/i18n";
import enUS from "antd/locale/en_US";
import styles from "./App.module.css";
import {
  Alert,
  Spin,
  App as AntApp,
  Button,
  ConfigProvider,
  Flex,
  Layout,
  Space,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  useMessengerSession,
  SESSION_ERROR_MESSAGES,
} from "@/features/messenger-session";
import { MessengerSession } from "@/app/ui/MessengerSession";
import { SessionPage } from "@/pages/session";
import "@/app/styles/index.css";

export default function App() {
  const translate = useDisplayText();
  const { t, i18n } = useTranslation("ui");

  useEffect(() => {
    document.documentElement.lang = z
      .string()
      .min(1)
      .parse(i18n.resolvedLanguage);

    document.title = t("app.appName");
  }, [t, i18n.resolvedLanguage]);

  const { credentials, client, verification, signOut, acceptVerifiedSession } =
    useMessengerSession();

  return (
    <ConfigProvider locale={enUS} theme={{ algorithm: theme.darkAlgorithm }}>
      <AntApp>
        <Layout className={styles.layout}>
          <Layout.Header>
            <Flex align="center" justify="space-between">
              <Typography.Title level={4}>{t("app.appName")}</Typography.Title>
              {credentials && (
                <Space>
                  <Tag>{t("app.instance", { id: credentials.instanceId })}</Tag>
                  <Tag>
                    {verification?.status === "success"
                      ? t("app.sessionActive")
                      : t("app.sessionUnverified")}
                  </Tag>
                  <Button onClick={signOut}>{t("app.signOut")}</Button>
                </Space>
              )}
            </Flex>
          </Layout.Header>
          <Layout.Content className={styles.content}>
            {credentials && client ? (
              verification?.status === "success" ? (
                <MessengerSession
                  key={`${credentials.apiUrl}:${credentials.instanceId}`}
                  client={client}
                />
              ) : verification?.status === "error" ? (
                <Alert
                  type="error"
                  title={translate(
                    errorText(
                      verification.error,
                      SESSION_ERROR_MESSAGES.VERIFICATION_FAILED,
                    ),
                  )}
                />
              ) : (
                <Spin description={t("app.verifying")} />
              )
            ) : (
              <SessionPage onReady={acceptVerifiedSession} />
            )}
          </Layout.Content>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
