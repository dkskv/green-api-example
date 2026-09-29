import { Button, Flex, Form, Input, Typography } from "antd";
import { useRef } from "react";

type MessageComposerValues = {
  draft: string;
};

type MessageComposerProps = {
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
  errorMessage: string;
};

export function MessageComposer({
  onSend,
  sending,
  errorMessage,
}: MessageComposerProps) {
  const [form] = Form.useForm<MessageComposerValues>();
  const draft = Form.useWatch("draft", form) ?? "";
  const draftVersion = useRef(0);

  async function submit(values: MessageComposerValues): Promise<void> {
    const version = draftVersion.current;
    const text = values.draft.trim();

    if (!text || sending) return;

    const sent = await onSend(text);

    if (sent && version === draftVersion.current)
      form.setFieldValue("draft", "");
  }

  return (
    <Form<MessageComposerValues>
      form={form}
      name="message-composer"
      initialValues={{ draft: "" }}
      onFinish={submit}
      onValuesChange={() => {
        draftVersion.current += 1;
      }}
    >
      <Flex
        gap="small"
        style={{
          alignItems: "flex-end",
          borderTop: "1px solid #f0f0f0",
          paddingTop: 12,
        }}
      >
        <Form.Item
          name="draft"
          style={{ flex: 1, minWidth: 0, marginBottom: 0 }}
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Enter a message.",
            },
          ]}
        >
          <Input.TextArea
            aria-label="Message text"
            placeholder="Write a message…"
            autoSize={{ minRows: 1, maxRows: 4 }}
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          disabled={!draft.trim()}
          loading={sending}
        >
          Send
        </Button>
      </Flex>
      {errorMessage && (
        <Typography.Text type="danger">{errorMessage}</Typography.Text>
      )}
    </Form>
  );
}
