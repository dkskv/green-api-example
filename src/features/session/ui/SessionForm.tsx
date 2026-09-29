import styles from "./SessionForm.module.css";
import { createGreenApiChatClient } from "@/integrations/green-api";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { SESSION_ERROR_MESSAGES } from "@/features/session/model/errors";
import { type GreenApiCredentials } from "@/integrations/green-api";

const DEFAULT_API_URL = "https://api.green-api.com";

type SessionFormProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function SessionForm({ onReady }: SessionFormProps) {
  const [errorMessage, setErrorMessage] = useState("");

  const [checking, setChecking] = useState(false);

  async function submit(values: GreenApiCredentials): Promise<void> {
    if (checking) return;

    const credentials: GreenApiCredentials = {
      apiUrl: new URL(values.apiUrl.trim()).origin,
      instanceId: values.instanceId.trim(),
      apiToken: values.apiToken.trim(),
    };

    setChecking(true);
    setErrorMessage("");

    try {
      const client = createGreenApiChatClient(credentials);

      await client.validateSession();
      onReady(credentials);
    } catch (reason) {
      setErrorMessage(
        reason instanceof Error
          ? reason.message
          : SESSION_ERROR_MESSAGES.VERIFICATION_FAILED,
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card title="Connect instance" className={styles.card}>
      <Typography.Paragraph type="secondary">
        Enter your GREEN API Telegram instance credentials.
      </Typography.Paragraph>
      <Form<GreenApiCredentials>
        name="session"
        layout="vertical"
        initialValues={{
          apiUrl: DEFAULT_API_URL,
          instanceId: "",
          apiToken: "",
        }}
        onFinish={submit}
      >
        <Form.Item
          name="apiUrl"
          label="API URL"
          rules={[
            {
              validator: async (_, value: string | undefined) => {
                try {
                  if (new URL(value?.trim() ?? "").protocol === "https:")
                    return;
                } catch {
                  // Для некорректного URL используется общая ошибка поля.
                }

                throw new Error(SESSION_ERROR_MESSAGES.INVALID_API_URL);
              },
            },
          ]}
        >
          <Input placeholder={DEFAULT_API_URL} />
        </Form.Item>
        <Form.Item
          name="instanceId"
          label="Instance ID"
          rules={[
            {
              required: true,
              whitespace: true,
              message: SESSION_ERROR_MESSAGES.MISSING_CREDENTIALS,
            },
          ]}
        >
          <Input placeholder="4100XXXXXXXX" />
        </Form.Item>
        <Form.Item
          name="apiToken"
          label="API token"
          rules={[
            {
              required: true,
              whitespace: true,
              message: SESSION_ERROR_MESSAGES.MISSING_CREDENTIALS,
            },
          ]}
        >
          <Input.Password placeholder="Enter your token" />
        </Form.Item>
        {errorMessage && (
          <Alert
            type="error"
            showIcon
            title={errorMessage}
            className={styles.error}
          />
        )}
        <Button type="primary" htmlType="submit" block loading={checking}>
          Continue
        </Button>
      </Form>
      <Alert
        type="warning"
        showIcon
        className={styles.notice}
        title="Credentials are stored in this browser for development. Do not use this storage approach in production."
      />
    </Card>
  );
}
