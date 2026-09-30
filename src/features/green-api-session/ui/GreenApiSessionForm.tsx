import { errorText } from "@/shared/ui/errorText";
import { useTranslation } from "@/shared/i18n";
import styles from "./GreenApiSessionForm.module.css";
import { useInitializeGreenApiSession } from "../model/useInitializeGreenApiSession";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Typography,
  type FormItemProps,
} from "antd";
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
  const initialization = useInitializeGreenApiSession(onReady);
  const errorMessage = initialization.isError
    ? errorText(initialization.error, t("errors:session.verificationFailed"))
    : "";

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
        onFinish={initialization.mutate}
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
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={initialization.isPending}
        >
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
