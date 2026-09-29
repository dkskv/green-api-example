import { type CSSProperties } from "react";
import { Button, Card, Flex, List, Typography } from "antd";
import { getMessageStatusLabel, type ChatMessage } from "@/entities/message";
import { formatMessageTime } from "../lib/formatMessageTime";

const incomingStyle: CSSProperties = {
  justifyContent: "flex-start",
  border: 0,
};
const outgoingStyle: CSSProperties = { justifyContent: "flex-end", border: 0 };
const cardStyle: CSSProperties = { maxWidth: "78%" };
const textStyle: CSSProperties = { whiteSpace: "pre-wrap" };

type ChatMessageItemProps = {
  message: ChatMessage;
  deleting: boolean;
  onDelete: (id: string) => void;
};

export function ChatMessageItem({
  message,
  deleting,
  onDelete,
}: ChatMessageItemProps) {
  const outgoing = message.direction === "outgoing";
  const handleDelete = () => onDelete(message.id);

  return (
    <List.Item style={outgoing ? outgoingStyle : incomingStyle}>
      <Card size="small" style={cardStyle}>
        <Flex vertical gap="small">
          <Typography.Text style={textStyle}>
            {message.text || "Message has no text content"}
          </Typography.Text>
          <Flex justify="flex-end" gap="small">
            <Typography.Text type="secondary">
              {formatMessageTime(message.timestamp)}
            </Typography.Text>
            {outgoing && (
              <Typography.Text type="secondary">
                {getMessageStatusLabel(message.status)}
              </Typography.Text>
            )}
          </Flex>
          {outgoing && (
            <Button
              size="small"
              type="text"
              danger
              loading={deleting}
              onClick={handleDelete}
            >
              Delete for everyone
            </Button>
          )}
        </Flex>
      </Card>
    </List.Item>
  );
}
