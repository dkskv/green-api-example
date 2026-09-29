import { useDisplayText } from "@/shared/i18n/useDisplayText";
import { useTranslation } from "@/shared/i18n";
import styles from "./ChatWindow.module.css";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { type ChatMessage } from "@/entities/message";
import {
  CONNECTION_STATE_LABELS,
  type ConnectionState,
} from "@/features/receive-messages";
import { type VerifiedContact } from "@/entities/contact";
import { MessageComposer } from "@/features/send-message";
import { ChatMessageItem } from "./ChatMessageItem";

type ChatWindowProps = {
  /** Выбранный контакт. */
  contact: VerifiedContact | null;
  /** Сообщения чата. */
  messages: ChatMessage[];
  /** Подсказка об истории. */
  historyNotice?: string;
  /** Загрузка истории. */
  loadingHistory: boolean;
  /** Ошибка чата. */
  errorMessage: string;
  /** Обновление истории. */
  onRefresh: () => void;
  /** Состояние соединения. */
  connectionState: ConnectionState;
  /** Отправка; результат — признак успеха. */
  onSend: (text: string) => Promise<boolean>;
  /** Выполняется отправка. */
  sending: boolean;
  /** Ошибка отправки. */
  sendErrorMessage: string;
  /** Идентификаторы удаляемых сообщений. */
  deletingIds: string[];
  /** Удаление сообщения. */
  onDelete: (id: string) => void;
};

export function ChatWindow({
  contact,
  messages,
  historyNotice,
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
  const translate = useDisplayText();
  const { t } = useTranslation("ui");
  const headerActions = contact && (
    <Space size="small">
      <Tag>{translate(CONNECTION_STATE_LABELS[connectionState])}</Tag>
      <Button onClick={onRefresh} loading={loadingHistory}>
        {t("chatWindow.refresh")}
      </Button>
    </Space>
  );
  const renderMessage = (message: ChatMessage) => (
    <ChatMessageItem
      key={message.id}
      message={message}
      deleting={deletingIds.includes(message.id)}
      onDelete={onDelete}
    />
  );
  const renderHistory = () => {
    if (!contact) {
      return <Empty description={t("chatWindow.openChat")} />;
    }

    if (loadingHistory && messages.length === 0) {
      return (
        <Flex justify="center" className={styles.loading}>
          <Spin description={t("chatWindow.loading")} />
        </Flex>
      );
    }

    if (messages.length === 0) {
      return <Empty description={t("chatWindow.empty")} />;
    }

    return (
      <Flex vertical gap="small">
        {historyNotice && (
          <Typography.Text type="secondary" className={styles.notice}>
            {historyNotice}
          </Typography.Text>
        )}
        <List split={false} dataSource={messages} renderItem={renderMessage} />
      </Flex>
    );
  };

  return (
    <Card
      title={contact ? `+${contact.phone}` : t("chatWindow.noChat")}
      extra={headerActions}
    >
      <Flex vertical gap="middle">
        {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
        <div className={styles.history} aria-live="polite">
          {renderHistory()}
        </div>
        {contact && (
          <MessageComposer
            key={contact.chatId}
            onSend={onSend}
            sending={sending}
            errorMessage={sendErrorMessage}
          />
        )}
      </Flex>
    </Card>
  );
}
