import { Alert, Flex } from "antd";
import { useMessenger } from "@/pages/messenger/model/useMessenger";
import { OpenChatForm } from "@/features/open-chat";
import { SEND_ERROR_MESSAGES } from "@/features/send-message";
import { type GreenApiClient } from "@/shared/api/green-api";
import { ChatWindow } from "@/widgets/chat-window";

type MessengerPageProps = {
  client: GreenApiClient;
};

export function MessengerPage({ client }: MessengerPageProps) {
  const messenger = useMessenger(client);
  const { connection, opening, history } = messenger;

  return (
    <Flex vertical gap="middle">
      <OpenChatForm loading={opening.isPending} onOpen={opening.openChat} />
      {messenger.errors.map(({ operation, message }) => (
        <Alert key={operation} type="error" showIcon title={message} />
      ))}
      {connection.deliveryErrorMessage && (
        <Alert type="error" showIcon title={connection.deliveryErrorMessage} />
      )}
      {connection.notice && (
        <Alert type="info" showIcon title={connection.notice} closable />
      )}
      <ChatWindow
        contact={messenger.activeContact}
        messages={messenger.messages}
        loadingHistory={history.isFetching}
        errorMessage={connection.errorMessage}
        connectionState={connection.state}
        onRefresh={() => void history.refetch()}
        onSend={messenger.sendMessage}
        sending={messenger.sending}
        sendErrorMessage={
          messenger.sendError
            ? SEND_ERROR_MESSAGES.sendFailed(messenger.sendError)
            : ""
        }
        deletingIds={messenger.deletingIds}
        onDelete={messenger.deleteMessage}
      />
    </Flex>
  );
}
