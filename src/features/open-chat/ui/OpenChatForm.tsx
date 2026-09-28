import { Button, Card, Flex, Input, Typography } from "antd";
import { useState } from "react";

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
  const [phone, setPhone] = useState(initialPhone);

  return (
    <Card title="New conversation">
      <Typography.Paragraph type="secondary">
        Enter a phone number in international format.
      </Typography.Paragraph>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onOpen(phone);
        }}
      >
        <Flex gap="small">
          <Input
            aria-label="Phone number"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 123-45-67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Button type="primary" htmlType="submit" loading={loading}>
            Open chat
          </Button>
        </Flex>
      </form>
    </Card>
  );
}
