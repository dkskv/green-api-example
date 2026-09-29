import { TranslatedText } from "@/shared/i18n/TranslatedText";
import { useDisplayText } from "@/shared/i18n/useDisplayText";
import type { DisplayText } from "@/shared/i18n/text";
import { errorText } from "@/shared/i18n/text";
import { useTranslation } from "@/shared/i18n";
import styles from "./SessionForm.module.css";
import { GreenApiChatClient } from "@/integrations/green-api";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { SESSION_ERROR_MESSAGES } from "@/features/messenger-session/model/errors";
import { type GreenApiCredentials } from "@/integrations/green-api";

const DEFAULT_API_URL = "https://api.green-api.com";

type SessionFormProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function SessionForm({ onReady }: SessionFormProps) {
  const translate = useDisplayText();
  const { t } = useTranslation("ui");
  const [errorMessage, setErrorMessage] = useState<DisplayText>("");

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
      const client = GreenApiChatClient.create(credentials);

      await client.validateSession();
      onReady(credentials);
    } catch (reason) {
      setErrorMessage(
        errorText(reason, SESSION_ERROR_MESSAGES.VERIFICATION_FAILED),
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card title={t("sessionForm.title")} className={styles.card}>
      <Typography.Paragraph type="secondary">
        {t("sessionForm.description")}
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
        <Form.Item<GreenApiCredentials>
          name="apiUrl"
          label={t("sessionForm.apiUrl")}
          rules={[
            {
              message: (
                <TranslatedText
                  value={SESSION_ERROR_MESSAGES.INVALID_API_URL}
                />
              ),
              validator: async (_, value: string | undefined) => {
                try {
                  if (new URL(value?.trim() ?? "").protocol === "https:")
                    return;
                } catch {
                  // Для некорректного URL используется общая ошибка поля.
                }

                throw new Error(SESSION_ERROR_MESSAGES.INVALID_API_URL.key);
              },
            },
          ]}
        >
          <Input placeholder={DEFAULT_API_URL} />
        </Form.Item>
        <Form.Item<GreenApiCredentials>
          name="instanceId"
          label={t("sessionForm.instanceId")}
          rules={[
            {
              required: true,
              whitespace: true,
              message: (
                <TranslatedText
                  value={SESSION_ERROR_MESSAGES.MISSING_CREDENTIALS}
                />
              ),
            },
          ]}
        >
          <Input placeholder={t("sessionForm.instancePlaceholder")} />
        </Form.Item>
        <Form.Item<GreenApiCredentials>
          name="apiToken"
          label={t("sessionForm.apiToken")}
          rules={[
            {
              required: true,
              whitespace: true,
              message: (
                <TranslatedText
                  value={SESSION_ERROR_MESSAGES.MISSING_CREDENTIALS}
                />
              ),
            },
          ]}
        >
          <Input.Password placeholder={t("sessionForm.tokenPlaceholder")} />
        </Form.Item>
        {errorMessage && (
          <Alert
            type="error"
            showIcon
            title={translate(errorMessage)}
            className={styles.error}
          />
        )}
        <Button type="primary" htmlType="submit" block loading={checking}>
          {t("sessionForm.continue")}
        </Button>
      </Form>
      <Alert
        type="warning"
        showIcon
        className={styles.notice}
        title={t("sessionForm.storageNotice")}
      />
    </Card>
  );
}
