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
} from "@/features/chat-notifications";
import { useActiveContact } from "../model/useActiveContact";
import { useStore } from "zustand";
import { useChatHistory } from "../model/useChatHistory";
import { useSendMessage } from "../model/useSendMessage";
import { useDeleteMessage } from "../model/useDeleteMessage";
import { getMessengerErrors } from "./getMessengerErrors";
import { OpenChatForm } from "@/features/open-chat";
import { errorText } from "@/shared/ui/errorText";
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
  const { t } = useTranslation(["ui", "errors"]);
  const [store] = useState(() => new MessageStore());

  const { onNotification, deliveryError } = useChatNotificationHandler(store);
  const connection = useChatNotifications({ client, onNotification });

  const selection = useActiveContact(client);
  const chatId = selection.activeContact?.chatId;

  const historyQuery = useChatHistory(client, store, chatId);
  const messages = useStore(store.state, (state) =>
    store.getMessages(chatId, state),
  );
  const send = useSendMessage(client, store, chatId);
  const deletion = useDeleteMessage(client, store, chatId);

  const errors = getMessengerErrors(
    {
      contact: selection.error,
      history: historyQuery.error,
      deletion: deletion.deleteError,
    },
    t,
  );

  return (
    <Flex vertical gap="middle">
      <OpenChatForm
        loading={selection.isPending}
        onOpen={selection.selectContact}
      />
      {errors.map(({ operation, message }) => (
        <Alert key={operation} type="error" showIcon title={message} />
      ))}
      {deliveryError && (
        <Alert
          type="error"
          showIcon
          title={t("errors:message.sendFailed", {
            chatId: deliveryError.chatId ?? t("errors:message.unknownChat"),
            description:
              deliveryError.description ?? t("errors:message.unknownError"),
          })}
        />
      )}
      <ChatWindow
        contact={selection.activeContact}
        messages={messages}
        historyNotice={
          historyNotice ??
          t("chatWindow.historyNotice", { count: client.historyLimit })
        }
        loadingHistory={historyQuery.isFetching}
        errorMessage={
          connection.status === CONNECTION_STATE.ERROR
            ? errorText(connection.error, t("errors:receive.receiveFailed"))
            : ""
        }
        connectionState={connection.status}
        onRefresh={() => void historyQuery.refetch()}
        onSend={send.sendMessage}
        sending={send.sending}
        sendErrorMessage={
          send.sendError
            ? t("errors:send.failed", {
                reason: errorText(send.sendError, t("errors:send.retry")),
              })
            : ""
        }
        deletingIds={deletion.deletingIds}
        onDelete={deletion.deleteMessage}
      />
    </Flex>
  );
}
