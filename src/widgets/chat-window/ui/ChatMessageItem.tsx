import { useDisplayText } from "@/shared/i18n/useDisplayText";
import { useTranslation } from "@/shared/i18n";
import styles from "./ChatMessageItem.module.css";
import { Button, Card, Flex, List, Typography } from "antd";
import { getMessageStatusLabel, type ChatMessage } from "@/entities/message";
import { formatMessageTime } from "../lib/formatMessageTime";

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
  const translate = useDisplayText();
  const { t, i18n } = useTranslation("ui");
  const outgoing = message.direction === "outgoing";
  const handleDelete = () => onDelete(message.id);

  return (
    <List.Item className={outgoing ? styles.outgoing : styles.incoming}>
      <Card size="small" className={styles.card}>
        <Flex vertical gap="small">
          <Typography.Text className={styles.text}>
            {message.text ||
              (message.placeholder
                ? translate(message.placeholder)
                : t("chatMessageItem.empty"))}
          </Typography.Text>
          <Flex justify="flex-end" gap="small">
            <Typography.Text type="secondary">
              {message.timestamp
                ? formatMessageTime(message.timestamp, i18n.resolvedLanguage)
                : translate({ key: "messages:now" })}
            </Typography.Text>
            {outgoing && (
              <Typography.Text type="secondary">
                {translate(getMessageStatusLabel(message.status) ?? "")}
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
              {t("chatMessageItem.delete")}
            </Button>
          )}
        </Flex>
      </Card>
    </List.Item>
  );
}
