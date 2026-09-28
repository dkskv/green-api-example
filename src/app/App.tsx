import { useEffect, useState } from "react";
import {
  Alert,
  Spin,
  App as AntApp,
  Button,
  Flex,
  Layout,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  clearSession,
  readCredentials,
  type GreenApiCredentials,
} from "../features/session";
import { MessengerPage } from "../pages/messenger";
import { SessionPage } from "../pages/session";
import { validateTelegramSession } from "../shared/api/green-api";
import "./styles.css";

export default function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(
    readCredentials,
  );

  const [verified, setVerified] = useState(false);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    if (!credentials || verified) return;
    const controller = new AbortController();
    validateTelegramSession(credentials, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setVerified(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setSessionError(
            reason instanceof Error
              ? reason.message
              : "Не удалось проверить сессию.",
          );
      });
    return () => controller.abort();
  }, [credentials, verified]);

  function handleSignOut(): void {
    setVerified(false);
    setSessionError("");
    clearSession();
    setCredentials(null);
  }

  return (
    <AntApp>
      <Layout style={{ minHeight: "100vh" }}>
        <Layout.Header>
          <Flex align="center" justify="space-between">
            <Typography.Title level={4}>Telegram</Typography.Title>
            {credentials && (
              <Space>
                <Tag>
                  {verified ? "Сессия активна" : "Сессия не подтверждена"}
                </Tag>
                <Button onClick={handleSignOut}>Выйти</Button>
              </Space>
            )}
          </Flex>
        </Layout.Header>
        <Layout.Content
          style={{ width: "min(1100px, 100%)", margin: "0 auto" }}
        >
          {credentials ? (
            verified ? (
              <MessengerPage credentials={credentials} />
            ) : sessionError ? (
              <Alert type="error" title={sessionError} />
            ) : (
              <Spin description="Проверяем сессию…" />
            )
          ) : (
            <SessionPage
              onReady={(value) => {
                setVerified(true);
                setCredentials(value);
              }}
            />
          )}
        </Layout.Content>
      </Layout>
    </AntApp>
  );
}
