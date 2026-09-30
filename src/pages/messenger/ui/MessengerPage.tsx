import { useChatNotificationHandler } from "../model/useChatNotificationHandler";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "@/shared/i18n";
import { useMessengerQueryClient } from "../model/useMessengerQueryClient";
import { Alert, Flex } from "antd";
import { useState } from "react";
import { MessageStore } from "@/entities/message";
import {
  CONNECTION_STATE,
  useChatNotifications,
} from "@/features/receive-messages";
import { useActiveContact } from "../model/useActiveContact";
import { useConversation } from "../model/useConversation";
import { getMessengerErrors } from "../model/getMessengerErrors";
import { OpenChatForm } from "@/features/open-chat";
import { SEND_ERROR_MESSAGES } from "@/features/send-message";
import { type ChatClient } from "@/entities/chat";
import { ChatWindow } from "@/widgets/chat-window";

type MessengerPageProps = {
  client: ChatClient;
  historyNotice?: string;
};

export function MessengerPage(props: MessengerPageProps) {
  const queryClient = useMessengerQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MessengerContent {...props} />
    </QueryClientProvider>
  );
}

function MessengerContent({ client, historyNotice }: MessengerPageProps) {
  const { t } = useTranslation("ui");
  const [store] = useState(() => new MessageStore());
  const { onNotification, deliveryErrorMessage } =
    useChatNotificationHandler(store);
  const connection = useChatNotifications({ client, onNotification });
  const selection = useActiveContact(client);
  const conversation = useConversation(
    client,
    store,
    selection.activeContact?.chatId,
  );
  const { history } = conversation;
  const errors = getMessengerErrors({
    contact: selection.error,
    history: history.error,
    deletion: conversation.deleteError,
  });

  return (
    <Flex vertical gap="middle">
      <OpenChatForm
        loading={selection.isPending}
        onOpen={selection.selectContact}
      />
      {errors.map(({ operation, message }) => (
        <Alert key={operation} type="error" showIcon title={message} />
      ))}
      {deliveryErrorMessage && (
        <Alert type="error" showIcon title={deliveryErrorMessage} />
      )}
      <ChatWindow
        contact={selection.activeContact}
        messages={conversation.messages}
        historyNotice={
          historyNotice ??
          t("chatWindow.historyNotice", { count: client.historyLimit })
        }
        loadingHistory={history.isFetching}
        errorMessage={
          connection.status === CONNECTION_STATE.ERROR ? connection.message : ""
        }
        connectionState={connection.status}
        onRefresh={() => void history.refetch()}
        onSend={conversation.sendMessage}
        sending={conversation.sending}
        sendErrorMessage={
          conversation.sendError
            ? SEND_ERROR_MESSAGES.sendFailed(conversation.sendError)
            : ""
        }
        deletingIds={conversation.deletingIds}
        onDelete={conversation.deleteMessage}
      />
    </Flex>
  );
}
