import { useState } from "react";
import {
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
import "./styles.css";

export default function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(
    readCredentials,
  );

  function handleSignOut(): void {
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
                <Tag>Сессия активна</Tag>
                <Button onClick={handleSignOut}>Выйти</Button>
              </Space>
            )}
          </Flex>
        </Layout.Header>
        <Layout.Content
          style={{ width: "min(1100px, 100%)", margin: "0 auto" }}
        >
          {credentials ? (
            <MessengerPage credentials={credentials} />
          ) : (
            <SessionPage onReady={setCredentials} />
          )}
        </Layout.Content>
      </Layout>
    </AntApp>
  );
}
