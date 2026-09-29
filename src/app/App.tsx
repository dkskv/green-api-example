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
import { useSession } from "@/features/session";
import { MessengerSession } from "@/app/MessengerSession";
import { SessionPage } from "@/pages/session";
import "@/app/styles.css";

export default function App() {
  const {
    credentials,
    client,
    verified,
    sessionErrorMessage,
    signOut,
    acceptVerifiedSession,
  } = useSession();

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
                <Button onClick={signOut}>Sign out</Button>
              </Space>
            )}
          </Flex>
        </Layout.Header>
        <Layout.Content
          style={{ width: "min(1100px, 100%)", margin: "0 auto" }}
        >
          {credentials && client ? (
            verified ? (
              <MessengerSession
                key={`${credentials.apiUrl}:${credentials.instanceId}`}
                client={client}
              />
            ) : sessionErrorMessage ? (
              <Alert type="error" title={sessionErrorMessage} />
            ) : (
              <Spin description="Verifying session…" />
            )
          ) : (
            <SessionPage onReady={acceptVerifiedSession} />
          )}
        </Layout.Content>
      </Layout>
    </AntApp>
  );
}
