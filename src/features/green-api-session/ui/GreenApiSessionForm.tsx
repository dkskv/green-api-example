import { errorText } from "@/shared/ui/errorText";
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
import { useEffect, useRef, useState } from "react";
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
  const { t } = useTranslation(["ui", "errors"]);
  const [failure, setFailure] = useState<{ reason: unknown } | null>(null);
  const errorMessage = failure
    ? errorText(failure.reason, t("errors:session.verificationFailed"))
    : "";

  const [checking, setChecking] = useState(false);

  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function submit(values: GreenApiCredentials): Promise<void> {
    if (request.current) return;

    const controller = new AbortController();

    request.current = controller;

    setChecking(true);
    setFailure(null);

    try {
      const credentials = greenApiCredentialsSchema.parse(values);
      const client = GreenApiChatClient.create(credentials);

      await client.initializeSession(controller.signal);
      controller.signal.throwIfAborted();
      onReady(credentials);
    } catch (reason) {
      if (controller.signal.aborted) return;

      setFailure({ reason });
    } finally {
      request.current = null;

      if (!controller.signal.aborted) setChecking(false);
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
          rules={credentialRules("apiUrl", t("errors:session.invalidApiUrl"))}
        >
          <Input placeholder={DEFAULT_API_URL} />
        </Form.Item>
        <Form.Item<GreenApiCredentials>
          name="instanceId"
          required
          label={t("greenApiSessionForm.instanceId")}
          rules={credentialRules(
            "instanceId",
            t("errors:session.missingCredentials"),
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
            t("errors:session.missingCredentials"),
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
