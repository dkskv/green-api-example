import { Alert, Button, Card, Flex, Input, Typography } from "antd";
import { useState, type FormEvent } from "react";
import { saveCredentials } from "../model/sessionStorage";
import type { GreenApiCredentials } from "../../../shared/api/green-api/types";

const DEFAULT_API_URL = "https://api.green-api.com";

type SessionFormProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function SessionForm({ onReady }: SessionFormProps) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [instanceId, setInstanceId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const credentials = {
      apiUrl: apiUrl.trim().replace(/\/+$/, ""),
      instanceId: instanceId.trim(),
      apiToken: apiToken.trim(),
    };
    try {
      const parsedApiUrl = new URL(credentials.apiUrl);
      if (parsedApiUrl.protocol !== "https:")
        throw new Error("HTTPS is required");
      credentials.apiUrl = parsedApiUrl.origin;
    } catch {
      setError("Укажите корректный HTTPS API URL.");
      return;
    }
    if (!credentials.instanceId || !credentials.apiToken) {
      setError("Укажите ID инстанса и API token");
      return;
    }
    saveCredentials(credentials);
    setError("");
    onReady(credentials);
  }

  return (
    <Card
      title="Открыть сессию"
      style={{ width: "min(440px, 100%)", margin: "7vh auto 0" }}
    >
      <Typography.Paragraph type="secondary">
        Введите данные Telegram-инстанса Green API.
      </Typography.Paragraph>
      <form onSubmit={submit}>
        <Flex vertical gap="middle">
          <label style={{ display: "grid", gap: 6 }}>
            <Typography.Text>API URL</Typography.Text>
            <Input
              type="url"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={DEFAULT_API_URL}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <Typography.Text>ID инстанса</Typography.Text>
            <Input
              value={instanceId}
              onChange={(event) => setInstanceId(event.target.value)}
              placeholder="4100XXXXXXXX"
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <Typography.Text>API token</Typography.Text>
            <Input.Password
              value={apiToken}
              onChange={(event) => setApiToken(event.target.value)}
              placeholder="Введите токен"
              required
            />
          </label>
          {error && <Alert type="error" showIcon message={error} />}
          <Button type="primary" htmlType="submit" block>
            Продолжить
          </Button>
        </Flex>
      </form>
      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
        title="Credentials временно сохраняются в localStorage только для разработки. Удалить перед production."
      />
    </Card>
  );
}
