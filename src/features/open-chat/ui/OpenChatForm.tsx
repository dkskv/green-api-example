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
import { normalizePhoneNumber } from "@/entities/contact";
import { OPEN_CHAT_ERROR_MESSAGES } from "@/features/open-chat/model/errors";

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
  const initialValues = { phone: initialPhone };
  const phoneRules: FormItemProps["rules"] = [
    {
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
    <Card title="New conversation">
      <Typography.Paragraph type="secondary">
        Enter a phone number in international format.
      </Typography.Paragraph>
      <Form<OpenChatFormValues>
        name="open-chat"
        initialValues={initialValues}
        onFinish={handleFinish}
      >
        <Flex gap="small">
          <Form.Item name="phone" className={styles.phone} rules={phoneRules}>
            <Input
              aria-label="Phone number"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 999 123-45-67"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Open chat
          </Button>
        </Flex>
      </Form>
    </Card>
  );
}
