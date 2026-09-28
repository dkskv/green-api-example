import { Button, Flex, Form, Input, Typography } from "antd";
import { useRef, useState } from "react";
import { SEND_ERROR_MESSAGES } from "@/features/send-message/model/errors";
import { sendChatMessage } from "@/features/send-message/model/sendMessage";
import { type ChatMessage } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";

type MessageComposerValues = {
  draft: string;
};

type MessageComposerProps = {
  client: GreenApiClient;
  chatId: string;
  onSent: (message: ChatMessage) => void;
};

export function MessageComposer({
  client,
  chatId,
  onSent,
}: MessageComposerProps) {
  const [form] = Form.useForm<MessageComposerValues>();
  const draft = Form.useWatch("draft", form) ?? "";
  const draftVersion = useRef(0);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(values: MessageComposerValues): Promise<void> {
    const version = draftVersion.current;
    const text = values.draft.trim();

    if (!text || sending) return;

    setSending(true);
    setErrorMessage("");

    try {
      const message = await sendChatMessage(client, chatId, text);

      onSent(message);

      if (version === draftVersion.current) form.setFieldValue("draft", "");
    } catch (reason) {
      setErrorMessage(SEND_ERROR_MESSAGES.sendFailed(reason));
    } finally {
      setSending(false);
    }
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
