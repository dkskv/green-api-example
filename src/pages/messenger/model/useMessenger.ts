import { useState } from "react";
import { useStore } from "zustand";
import { contactStore } from "@/features/session";
import { useReceiveMessages } from "@/features/receive-messages";
import { MessageStore, emptyMessages } from "@/entities/message";
import { type ChatClient } from "@/entities/chat";
import { useChatHistory } from "@/pages/messenger/model/useChatHistory";
import { useOpenChat } from "@/pages/messenger/model/useOpenChat";
import { useMessageActions } from "@/pages/messenger/model/useMessageActions";
import { MESSENGER_ERROR_MESSAGES } from "@/pages/messenger/model/errors";

export function useMessenger(client: ChatClient) {
  const [store] = useState(() => new MessageStore());
  const activeContact = useStore(contactStore.state, (state) => state.contact);
  const connection = useReceiveMessages(client, store.receive);
  const history = useChatHistory(client, store, activeContact?.chatId);
  const opening = useOpenChat(client, store, contactStore.save);
  const actions = useMessageActions(client, store, activeContact?.chatId);
  const messages = useStore(
    store.state,
    (state) =>
      state.chats[activeContact?.chatId ?? ""]?.messages ?? emptyMessages,
  );

  const errors = [
    {
      operation: "open",
      error: opening.error,
      fallback: MESSENGER_ERROR_MESSAGES.OPEN_FAILED,
    },
    {
      operation: "history",
      error: history.error,
      fallback: MESSENGER_ERROR_MESSAGES.REFRESH_FAILED,
    },
    {
      operation: "delete",
      error: actions.deleteError,
      fallback: MESSENGER_ERROR_MESSAGES.DELETE_FAILED,
    },
  ]
    .filter(({ error }) => error)
    .map(({ operation, error, fallback }) => ({
      operation,
      message: error instanceof Error ? error.message : fallback,
    }));

  return {
    activeContact,
    messages,
    connection,
    history,
    opening,
    errors,
    ...actions,
  };
}
