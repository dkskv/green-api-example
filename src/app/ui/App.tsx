import { useEffect } from "react";
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
import { useSession } from "@/features/session";
import { MessengerSession } from "@/app/ui/MessengerSession";
import { SessionPage } from "@/pages/session";
import "@/app/styles/index.css";

export default function App() {
  const translate = useDisplayText();
  const { t, i18n } = useTranslation("ui");

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
    document.title = t("app.appName");
  }, [t, i18n.resolvedLanguage]);

  const {
    credentials,
    client,
    verified,
    sessionErrorMessage,
    signOut,
    acceptVerifiedSession,
  } = useSession();

  return (
    <ConfigProvider locale={enUS} theme={{ algorithm: theme.darkAlgorithm }}>
      <AntApp>
        <Layout className={styles.layout}>
          <Layout.Header>
            <Flex align="center" justify="space-between">
              <Typography.Title level={4}>{t("app.appName")}</Typography.Title>
              {credentials && (
                <Space>
                  <Tag>
                    {verified
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
              verified ? (
                <MessengerSession
                  key={`${credentials.apiUrl}:${credentials.instanceId}`}
                  client={client}
                />
              ) : sessionErrorMessage ? (
                <Alert type="error" title={translate(sessionErrorMessage)} />
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
