import { useTranslation } from "@/shared/i18n";
import enUS from "antd/locale/en_US";
import styles from "./App.module.css";
import {
  App as AntApp,
  ConfigProvider,
  Flex,
  Layout,
  Typography,
  theme,
} from "antd";
import { useGreenApiSession } from "@/features/green-api-session";
import { AppContent } from "./AppContent";
import { SessionStatusBar } from "./SessionStatusBar";
import { useDocumentLocalization } from "../model/useDocumentLocalization";
import "../styles/index.css";

export function App() {
  const { t } = useTranslation("ui");

  useDocumentLocalization();

  const session = useGreenApiSession();
  const { credentials, verification, signOut } = session;

  return (
    <ConfigProvider locale={enUS} theme={{ algorithm: theme.darkAlgorithm }}>
      <AntApp>
        <Layout className={styles.layout}>
          <Flex vertical gap="large">
            <Layout.Header>
              <Flex
                className={styles.headerContent}
                align="center"
                justify="space-between"
              >
                <Typography.Title level={4} style={{ marginBottom: 0 }}>
                  {t("app.appName")}
                </Typography.Title>
                {credentials && (
                  <SessionStatusBar
                    instanceId={credentials.instanceId}
                    status={verification?.status}
                    onSignOut={signOut}
                  />
                )}
              </Flex>
            </Layout.Header>
            <Layout.Content className={styles.content}>
              <AppContent session={session} />
            </Layout.Content>
          </Flex>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
