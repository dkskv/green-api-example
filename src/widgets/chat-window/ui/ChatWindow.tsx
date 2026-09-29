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
import { getMessageStatusLabel, type ChatMessage } from "@/entities/message";
import {
  CONNECTION_STATE_LABELS,
  type ConnectionState,
} from "@/features/receive-messages";
import { type VerifiedChat } from "@/entities/chat";
import { MessageComposer } from "@/features/send-message";

type ChatWindowProps = {
  chat: VerifiedChat | null;
  messages: ChatMessage[];
  loadingHistory: boolean;
  errorMessage: string;
  onRefresh: () => void;
  connectionState: ConnectionState;
  onSend: (text: string) => Promise<boolean>;
  sending: boolean;
  sendErrorMessage: string;
  deletingIds: string[];
  onDelete: (id: string) => void;
};

export function ChatWindow({
  chat,
  messages,
  loadingHistory,
  errorMessage,
  onRefresh,
  connectionState,
  onSend,
  sending,
  sendErrorMessage,
  deletingIds,
  onDelete,
}: ChatWindowProps) {
  return (
    <Card
      title={chat ? `+${chat.phone}` : "No chat selected"}
      extra={
        chat && (
          <Flex align="center" gap="small">
            <Tag>{CONNECTION_STATE_LABELS[connectionState]}</Tag>
            <Button
              onClick={onRefresh}
              loading={loadingHistory}
              disabled={!chat}
            >
              Refresh history
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
          <Empty description="Open a chat using a phone number" />
        ) : loadingHistory && messages.length === 0 ? (
          <Flex justify="center" style={{ padding: 32 }}>
            <Spin description="Loading history…" />
          </Flex>
        ) : messages.length === 0 ? (
          <Empty description="No messages yet. Send a message to start the conversation." />
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
              The latest 100 messages are loaded when you open a chat.
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
                      {message.text || "Message has no text content"}
                    </Typography.Paragraph>
                    <Flex justify="flex-end" gap={8} style={{ marginTop: 6 }}>
                      <Typography.Text type="secondary">
                        {message.timestamp
                          ? new Date(
                              message.timestamp * 1000,
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "now"}
                      </Typography.Text>
                      {message.direction === "outgoing" && (
                        <Typography.Text type="secondary">
                          {getMessageStatusLabel(message.status)}
                        </Typography.Text>
                      )}
                    </Flex>
                    {message.direction === "outgoing" && chat && (
                      <Button
                        size="small"
                        type="text"
                        danger
                        loading={deletingIds.includes(message.id)}
                        onClick={() => onDelete(message.id)}
                      >
                        Delete for everyone
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
          onSend={onSend}
          sending={sending}
          errorMessage={sendErrorMessage}
        />
      )}
    </Card>
  );
}
