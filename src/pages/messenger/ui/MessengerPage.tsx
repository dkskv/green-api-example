import { useDisplayText } from "@/shared/i18n/useDisplayText";
import { Alert, Flex } from "antd";
import { useMessenger } from "@/pages/messenger/model/useMessenger";
import { OpenChatForm } from "@/features/open-chat";
import { SEND_ERROR_MESSAGES } from "@/features/send-message";
import { type ChatClient } from "@/entities/chat";
import { ChatWindow } from "@/widgets/chat-window";

type MessengerPageProps = {
  client: ChatClient;
  historyNotice?: string;
};

export function MessengerPage({ client, historyNotice }: MessengerPageProps) {
  const translate = useDisplayText();
  const messenger = useMessenger(client);
  const { connection, opening, history } = messenger;

  return (
    <Flex vertical gap="middle">
      <OpenChatForm loading={opening.isPending} onOpen={opening.openChat} />
      {messenger.errors.map(({ operation, message }) => (
        <Alert
          key={operation}
          type="error"
          showIcon
          title={translate(message)}
        />
      ))}
      {connection.deliveryErrorMessage && (
        <Alert
          type="error"
          showIcon
          title={translate(connection.deliveryErrorMessage)}
        />
      )}
      {connection.notice && (
        <Alert
          type="info"
          showIcon
          title={translate(connection.notice)}
          closable
        />
      )}
      <ChatWindow
        contact={messenger.activeContact}
        messages={messenger.messages}
        historyNotice={historyNotice}
        loadingHistory={history.isFetching}
        errorMessage={translate(connection.errorMessage)}
        connectionState={connection.state}
        onRefresh={() => void history.refetch()}
        onSend={messenger.sendMessage}
        sending={messenger.sending}
        sendErrorMessage={
          messenger.sendError
            ? translate(SEND_ERROR_MESSAGES.sendFailed(messenger.sendError))
            : ""
        }
        deletingIds={messenger.deletingIds}
        onDelete={messenger.deleteMessage}
      />
    </Flex>
  );
}
