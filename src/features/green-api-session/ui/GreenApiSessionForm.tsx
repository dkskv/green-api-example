import { errorText } from "@/shared/lib/errorText";
import { useTranslation } from "@/shared/i18n";
import styles from "./GreenApiSessionForm.module.css";
import { GreenApiChatClient } from "../api/GreenApiChatClient";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Typography,
  type FormItemProps,
} from "antd";
import { useState } from "react";
import { GREEN_API_SESSION_ERROR_MESSAGES } from "../model/errors";
import {
  greenApiCredentialsSchema,
  type GreenApiCredentials,
} from "@/shared/api/green-api";

const DEFAULT_API_URL = "https://api.green-api.com";

function credentialRules(
  field: keyof GreenApiCredentials,
  message: string,
): FormItemProps["rules"] {
  return [
    {
      message,
      validator: async (_, value: unknown) => {
        if (!greenApiCredentialsSchema.shape[field].safeParse(value).success)
          throw new Error(message);
      },
    },
  ];
}

type GreenApiSessionFormProps = {
  onReady: (credentials: GreenApiCredentials) => void;
};

export function GreenApiSessionForm({ onReady }: GreenApiSessionFormProps) {
  const { t } = useTranslation("ui");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [checking, setChecking] = useState(false);

  async function submit(values: GreenApiCredentials): Promise<void> {
    if (checking) return;

    setChecking(true);
    setErrorMessage("");

    try {
      const credentials = greenApiCredentialsSchema.parse(values);
      const client = GreenApiChatClient.create(credentials);

      await client.validateSession();
      onReady(credentials);
    } catch (reason) {
      setErrorMessage(
        errorText(reason, GREEN_API_SESSION_ERROR_MESSAGES.verificationFailed),
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card title={t("greenApiSessionForm.title")} className={styles.card}>
      <Typography.Paragraph type="secondary">
        {t("greenApiSessionForm.description")}
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
          label={t("greenApiSessionForm.apiUrl")}
          rules={credentialRules(
            "apiUrl",
            GREEN_API_SESSION_ERROR_MESSAGES.invalidApiUrl,
          )}
        >
          <Input placeholder={DEFAULT_API_URL} />
        </Form.Item>
        <Form.Item<GreenApiCredentials>
          name="instanceId"
          required
          label={t("greenApiSessionForm.instanceId")}
          rules={credentialRules(
            "instanceId",
            GREEN_API_SESSION_ERROR_MESSAGES.missingCredentials,
          )}
        >
          <Input placeholder={t("greenApiSessionForm.instancePlaceholder")} />
        </Form.Item>
        <Form.Item<GreenApiCredentials>
          name="apiToken"
          required
          label={t("greenApiSessionForm.apiToken")}
          rules={credentialRules(
            "apiToken",
            GREEN_API_SESSION_ERROR_MESSAGES.missingCredentials,
          )}
        >
          <Input.Password
            placeholder={t("greenApiSessionForm.tokenPlaceholder")}
          />
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
          {t("greenApiSessionForm.continue")}
        </Button>
      </Form>
      <Alert
        type="warning"
        showIcon
        className={styles.notice}
        title={t("greenApiSessionForm.storageNotice")}
      />
    </Card>
  );
}
