import { useTranslation } from "@/shared/i18n";
import styles from "./ChatMessageItem.module.css";
import { Button, Card, Flex, List, Typography, theme } from "antd";
import { type ChatMessage } from "@/entities/message";
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
  const { token } = theme.useToken();
  const { t, i18n } = useTranslation("ui");
  const outgoing = message.direction === "outgoing";
  const handleDelete = () => onDelete(message.id);

  return (
    <List.Item className={outgoing ? styles.outgoing : styles.incoming}>
      <Card
        size="small"
        className={styles.card}
        style={{
          backgroundColor: outgoing
            ? token.colorPrimaryBg
            : token.colorBgContainer,
        }}
      >
        <Flex vertical gap="small">
          <Typography.Text className={styles.text}>
            {message.unsupported
              ? t("placeholders.unsupported", { ns: "messages" })
              : message.text || t("chatMessageItem.empty")}
          </Typography.Text>
          <Flex justify="space-between" gap="small">
            <Typography.Text
              type="secondary"
              style={{ fontSize: token.fontSizeSM }}
            >
              {message.timestamp
                ? formatMessageTime(message.timestamp, i18n.resolvedLanguage)
                : t("now", { ns: "messages" })}
            </Typography.Text>
            {outgoing && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: token.fontSizeSM }}
              >
                {message.status &&
                  t(`status.${message.status}`, { ns: "messages" })}
              </Typography.Text>
            )}
          </Flex>
          {outgoing && (
            <Flex justify="flex-end">
              <Button
                size="small"
                type="text"
                style={{
                  color: token.colorTextSecondary,
                  fontSize: token.fontSizeSM,
                }}
                loading={deleting}
                onClick={handleDelete}
              >
                {t("chatMessageItem.delete")}
              </Button>
            </Flex>
          )}
        </Flex>
      </Card>
    </List.Item>
  );
}
