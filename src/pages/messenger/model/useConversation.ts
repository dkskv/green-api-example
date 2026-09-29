import { useStore } from "zustand";
import { type ChatClient } from "@/entities/chat";
import { type MessageStore } from "@/entities/message";
import { useChatHistory } from "./useChatHistory";
import { useMessageActions } from "./useMessageActions";

/** История, сообщения и действия выбранного чата. */
export function useConversation(
  client: ChatClient,
  store: MessageStore,
  chatId?: string,
) {
  const history = useChatHistory(client, store, chatId);
  const actions = useMessageActions(client, store, chatId);
  const messages = useStore(store.state, (state) =>
    store.getMessages(chatId, state),
  );

  return { history, messages, ...actions };
}
