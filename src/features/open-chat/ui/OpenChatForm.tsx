import { useTranslation } from "@/shared/i18n";
import styles from "./OpenChatForm.module.css";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Typography,
  type FormItemProps,
} from "antd";
import { formatPhoneNumber, normalizePhoneNumber } from "@/entities/contact";
import { OPEN_CHAT_ERROR_MESSAGES } from "../model/errors";

type OpenChatFormValues = {
  phone: string;
};

type OpenChatFormProps = {
  initialPhone?: string;
  loading: boolean;
  onOpen: (phone: string) => void;
};

export function OpenChatForm({
  initialPhone = "",
  loading,
  onOpen,
}: OpenChatFormProps) {
  const { t } = useTranslation("ui");
  const initialValues = { phone: initialPhone };
  const phoneRules: FormItemProps["rules"] = [
    {
      message: OPEN_CHAT_ERROR_MESSAGES.INVALID_PHONE,
      validator: async (_, value: string | undefined) => {
        if (!normalizePhoneNumber(value ?? "")) {
          throw new Error(OPEN_CHAT_ERROR_MESSAGES.INVALID_PHONE);
        }
      },
    },
  ];
  const handleFinish = ({ phone }: OpenChatFormValues) => {
    if (loading) return;

    const normalizedPhone = normalizePhoneNumber(phone);

    if (normalizedPhone) onOpen(normalizedPhone);
  };

  return (
    <Card title={t("openChatForm.title")}>
      <Typography.Paragraph type="secondary">
        {t("openChatForm.description")}
      </Typography.Paragraph>
      <Form<OpenChatFormValues>
        name="open-chat"
        initialValues={initialValues}
        onFinish={handleFinish}
      >
        <Flex gap="small">
          <Form.Item<OpenChatFormValues>
            name="phone"
            className={styles.phone}
            rules={phoneRules}
          >
            <Input
              aria-label={t("openChatForm.phone")}
              inputMode="tel"
              autoComplete="tel"
              placeholder={formatPhoneNumber(
                t("openChatForm.phonePlaceholder"),
              )}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t("openChatForm.open")}
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
