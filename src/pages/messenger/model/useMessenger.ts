import { useState, useSyncExternalStore } from "react";
import { readSavedContact } from "@/features/session";
import { useReceiveMessages } from "@/features/receive-messages";
import { type VerifiedContact } from "@/entities/contact";
import { MessageStore } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";
import { useChatHistory } from "@/pages/messenger/model/useChatHistory";
import { useOpenChat } from "@/pages/messenger/model/useOpenChat";
import { useMessageActions } from "@/pages/messenger/model/useMessageActions";
import { MESSENGER_ERROR_MESSAGES } from "@/pages/messenger/model/errors";

export function useMessenger(client: GreenApiClient) {
  const [store] = useState(() => new MessageStore());
  const [activeContact, setActiveContact] = useState<VerifiedContact | null>(
    readSavedContact,
  );
  const connection = useReceiveMessages(client, store.receive);
  const history = useChatHistory(client, store, activeContact?.chatId);
  const opening = useOpenChat(client, store, setActiveContact);
  const actions = useMessageActions(client, store, activeContact?.chatId);
  const messages = useSyncExternalStore(store.subscribe, () =>
    store.getMessages(activeContact?.chatId ?? ""),
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
