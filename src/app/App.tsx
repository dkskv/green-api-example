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
  SESSION_ERROR_MESSAGES,
  clearSession,
  readCredentials,
  type GreenApiCredentials,
} from "@/features/session";
import { MessengerPage } from "@/pages/messenger";
import { SessionPage } from "@/pages/session";
import { validateTelegramSession } from "@/shared/api/green-api";
import "@/app/styles.css";

export default function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(
    readCredentials,
  );

  const [verified, setVerified] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState("");

  useEffect(() => {
    if (!credentials || verified) return;

    const controller = new AbortController();

    validateTelegramSession(credentials, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setVerified(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setSessionErrorMessage(
            reason instanceof Error
              ? reason.message
              : SESSION_ERROR_MESSAGES.VERIFICATION_FAILED,
          );
      });

    return () => controller.abort();
  }, [credentials, verified]);

  function handleSignOut(): void {
    setVerified(false);
    setSessionErrorMessage("");
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
                  {verified ? "Session active" : "Session not verified"}
                </Tag>
                <Button onClick={handleSignOut}>Sign out</Button>
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
            ) : sessionErrorMessage ? (
              <Alert type="error" title={sessionErrorMessage} />
            ) : (
              <Spin description="Verifying session…" />
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
