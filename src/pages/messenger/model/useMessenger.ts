import { useState, useSyncExternalStore } from "react";
import { readSavedChat } from "@/features/session";
import { useReceiveMessages } from "@/features/receive-messages";
import { type VerifiedChat } from "@/entities/chat";
import { MessageStore } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";
import { useChatHistory } from "@/pages/messenger/model/useChatHistory";
import { useOpenChat } from "@/pages/messenger/model/useOpenChat";
import { useMessageActions } from "@/pages/messenger/model/useMessageActions";
import { MESSENGER_ERROR_MESSAGES } from "@/pages/messenger/model/errors";

export function useMessenger(client: GreenApiClient) {
  const [store] = useState(() => new MessageStore());
  const [chat, setChat] = useState<VerifiedChat | null>(readSavedChat);
  const connection = useReceiveMessages(client, store.receive);
  const history = useChatHistory(client, store, chat?.chatId);
  const opening = useOpenChat(client, store, setChat);
  const actions = useMessageActions(client, store, chat?.chatId);
  const messages = useSyncExternalStore(store.subscribe, () =>
    store.getMessages(chat?.chatId ?? ""),
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

  return { chat, messages, connection, history, opening, errors, ...actions };
}
