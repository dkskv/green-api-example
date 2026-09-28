import { Button, Flex, Input, Typography } from "antd";
import { useRef, useState, type FormEvent } from "react";
import { sendChatMessage } from "../model/sendMessage";
import type { ChatMessage } from "../../../entities/message";
import type { GreenApiCredentials } from "../../../shared/api/green-api";

type MessageComposerProps = {
  credentials: GreenApiCredentials;
  chatId: string;
  onSent: (message: ChatMessage) => void;
};

export function MessageComposer({
  credentials,
  chatId,
  onSent,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const draftVersion = useRef(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const version = draftVersion.current;
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await sendChatMessage(credentials, chatId, text);
      onSent(message);
      if (version === draftVersion.current) setDraft("");
    } catch (reason) {
      setError(
        `Сообщение не отправлено. Текст сохранён. ${reason instanceof Error ? reason.message : "Попробуйте ещё раз."}`,
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Flex
        gap="small"
        style={{
          alignItems: "flex-end",
          borderTop: "1px solid #f0f0f0",
          paddingTop: 12,
        }}
      >
        <Input.TextArea
          aria-label="Текст сообщения"
          placeholder="Написать сообщение…"
          value={draft}
          onChange={(event) => {
            draftVersion.current += 1;
            setDraft(event.target.value);
          }}
          autoSize={{ minRows: 1, maxRows: 4 }}
        />
        <Button
          type="primary"
          htmlType="submit"
          disabled={!draft.trim()}
          loading={sending}
        >
          Отправить
        </Button>
      </Flex>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </form>
  );
}
