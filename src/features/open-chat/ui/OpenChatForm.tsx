import { Button, Card, Flex, Form, Input, Typography } from "antd";
import { normalizePhone } from "@/entities/chat";
import { OPEN_CHAT_ERROR_MESSAGES } from "@/features/open-chat/model/errors";

type OpenChatFormValues = {
  phone: string;
};

type OpenChatFormProps = {
  initialPhone?: string;
  loading: boolean;
  onOpen: (phone: string) => Promise<void>;
};

export function OpenChatForm({
  initialPhone = "",
  loading,
  onOpen,
}: OpenChatFormProps) {
  return (
    <Card title="New conversation">
      <Typography.Paragraph type="secondary">
        Enter a phone number in international format.
      </Typography.Paragraph>
      <Form<OpenChatFormValues>
        name="open-chat"
        initialValues={{ phone: initialPhone }}
        onFinish={({ phone }) => {
          if (!loading) return onOpen(phone);
        }}
      >
        <Flex gap="small">
          <Form.Item
            name="phone"
            style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
            rules={[
              {
                validator: async (_, value: string | undefined) => {
                  if (!normalizePhone(value ?? "")) {
                    throw new Error(OPEN_CHAT_ERROR_MESSAGES.INVALID_PHONE);
                  }
                },
              },
            ]}
          >
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
