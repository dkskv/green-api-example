import { useCallback } from "react";
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
import type { VerifiedChat } from "../../../entities/chat";
import type { ChatMessage } from "../../../entities/message";
import { MessageComposer } from "../../../features/send-message";
import { useReceiveMessages } from "../../../features/receive-messages";
import type { GreenApiCredentials } from "../../../shared/api/green-api";

type ChatWindowProps = {
  credentials: GreenApiCredentials;
  chat: VerifiedChat | null;
  messages: ChatMessage[];
  loadingHistory: boolean;
  error: string;
  onRefresh: () => void;
  onIncoming: (message: ChatMessage) => void;
  onSent: (message: ChatMessage) => void;
};

export function ChatWindow({
  credentials,
  chat,
  messages,
  loadingHistory,
  error,
  onRefresh,
  onIncoming,
  onSent,
}: ChatWindowProps) {
  const handleIncoming = useCallback(
    (message: ChatMessage) => onIncoming(message),
    [onIncoming],
  );
  const connection = useReceiveMessages(
    credentials,
    chat?.chatId ?? "",
    handleIncoming,
  );

  return (
    <Card
      title={chat ? `+${chat.phone}` : "Чат не выбран"}
      extra={
        chat && (
          <Flex align="center" gap="small">
            <Tag>
              {connection.state === "online"
                ? "Приём активен"
                : connection.state === "error"
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
      {connection.error && (
        <Alert
          type="warning"
          showIcon
          title={connection.error}
          style={{ marginBottom: 12 }}
        />
      )}
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
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
              Последние 100 сообщений. Старая история не подгружается.
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
                          {message.status}
                        </Typography.Text>
                      )}
                    </Flex>
                  </Card>
                </List.Item>
              )}
            />
          </>
        )}
      </div>

      {chat && (
        <MessageComposer
          credentials={credentials}
          chatId={chat.chatId}
          onSent={onSent}
        />
      )}
    </Card>
  );
}
