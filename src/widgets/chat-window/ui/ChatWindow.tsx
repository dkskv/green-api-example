import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  List,
  Spin,
  Tag,
  Typography,
} from "antd";
import type { VerifiedChat } from "@/entities/chat";
import type { ChatMessage } from "@/entities/message";
import { MessageComposer } from "@/features/send-message";
import type { GreenApiCredentials } from "@/shared/api/green-api";

type ChatWindowProps = {
  credentials: GreenApiCredentials;
  chat: VerifiedChat | null;
  messages: ChatMessage[];
  loadingHistory: boolean;
  errorMessage: string;
  onRefresh: () => void;
  connectionState: string;
  onSent: (chatId: string, message: ChatMessage) => void;
  onDelete: (chatId: string, id: string) => Promise<void>;
};

export function ChatWindow({
  credentials,
  chat,
  messages,
  loadingHistory,
  errorMessage,
  onRefresh,
  connectionState,
  onSent,
  onDelete,
}: ChatWindowProps) {
  const [deleting, setDeleting] = useState<string[]>([]);
  async function remove(chatId: string, id: string) {
    const key = `${chatId}:${id}`;
    setDeleting((current) => [...current, key]);
    try {
      await onDelete(chatId, id);
    } finally {
      setDeleting((current) => current.filter((item) => item !== key));
    }
  }
  const statuses: Record<string, string> = {
    pending: "В очереди",
    sent: "Отправлено",
    delivered: "Доставлено",
    read: "Прочитано",
    failed: "Ошибка отправки",
    noAccount: "Аккаунт не найден",
  };

  return (
    <Card
      title={chat ? `+${chat.phone}` : "Чат не выбран"}
      extra={
        chat && (
          <Flex align="center" gap="small">
            <Tag>
              {connectionState === "online"
                ? "Приём активен"
                : connectionState === "error"
                  ? "Ошибка приёма"
                  : "Подключение"}
            </Tag>
            <Button
              onClick={onRefresh}
              loading={loadingHistory}
              disabled={!chat}
            >
              Обновить историю
            </Button>
          </Flex>
        )
      }
    >
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title={errorMessage}
          style={{ marginBottom: 12 }}
        />
      )}

      <div
        style={{ maxHeight: "60vh", minHeight: 280, overflowY: "auto" }}
        aria-live="polite"
      >
        {!chat ? (
          <Empty description="Откройте чат по номеру телефона" />
        ) : loadingHistory && messages.length === 0 ? (
          <Flex justify="center" style={{ padding: 32 }}>
            <Spin description="Загружаем историю…" />
          </Flex>
        ) : messages.length === 0 ? (
          <Empty description="История пуста. Начните диалог сообщением." />
        ) : (
          <>
            <Typography.Text
              type="secondary"
              style={{
                display: "block",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              При открытии загружаются последние 100 сообщений.
            </Typography.Text>
            <List
              split={false}
              dataSource={messages}
              renderItem={(message) => (
                <List.Item
                  key={message.id}
                  style={{
                    justifyContent:
                      message.direction === "outgoing"
                        ? "flex-end"
                        : "flex-start",
                    border: 0,
                  }}
                >
                  <Card size="small" style={{ maxWidth: "78%" }}>
                    <Typography.Paragraph
                      style={{ margin: 0, whiteSpace: "pre-wrap" }}
                    >
                      {message.text || "Сообщение без текстового содержимого"}
                    </Typography.Paragraph>
                    <Flex justify="flex-end" gap={8} style={{ marginTop: 6 }}>
                      <Typography.Text type="secondary">
                        {message.timestamp
                          ? new Date(
                              message.timestamp * 1000,
                            ).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "сейчас"}
                      </Typography.Text>
                      {message.direction === "outgoing" && (
                        <Typography.Text type="secondary">
                          {statuses[message.status ?? ""] ?? message.status}
                        </Typography.Text>
                      )}
                    </Flex>
                    {message.direction === "outgoing" && chat && (
                      <Button
                        size="small"
                        type="text"
                        danger
                        loading={deleting.includes(
                          `${chat.chatId}:${message.id}`,
                        )}
                        onClick={() => void remove(chat.chatId, message.id)}
                      >
                        Удалить у всех
                      </Button>
                    )}
                  </Card>
                </List.Item>
              )}
            />
          </>
        )}
      </div>

      {chat && (
        <MessageComposer
          key={chat.chatId}
          credentials={credentials}
          chatId={chat.chatId}
          onSent={(message) => onSent(chat.chatId, message)}
        />
      )}
    </Card>
  );
}
