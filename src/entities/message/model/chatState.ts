import { newerStatus, type MessageStatus } from "./status";
import { type ChatMessage } from "./message";

export type ChatState = {
  messages: ChatMessage[];
  pendingStatuses: Record<string, MessageStatus>;
};

export const emptyChatState: ChatState = {
  messages: [],
  pendingStatuses: {},
};

/** Объединяет историю и события, не откатывая уже известные статусы. */
export function mergeMessages(
  state: ChatState = emptyChatState,
  messages: ChatMessage[],
): ChatState {
  const byId = new Map(state.messages.map((message) => [message.id, message]));
  const pendingStatuses = { ...state.pendingStatuses };

  for (const message of messages) {
    const previous = byId.get(message.id);

    byId.set(message.id, {
      ...previous,
      ...message,
      status: newerStatus(
        newerStatus(previous?.status, message.status),
        pendingStatuses[message.id],
      ),
    });

    delete pendingStatuses[message.id];
  }

  return {
    messages: [...byId.values()].sort((a, b) => a.timestamp - b.timestamp),
    pendingStatuses,
  };
}

export function updateMessageStatus(
  state: ChatState = emptyChatState,
  id: string,
  status: MessageStatus,
): ChatState {
  if (!state.messages.some((message) => message.id === id)) {
    return {
      ...state,
      pendingStatuses: {
        ...state.pendingStatuses,
        [id]: newerStatus(state.pendingStatuses[id], status)!,
      },
    };
  }

  return {
    ...state,
    messages: state.messages.map((message) =>
      message.id === id
        ? { ...message, status: newerStatus(message.status, status) }
        : message,
    ),
  };
}

export function removeMessage(
  state: ChatState = emptyChatState,
  id: string,
): ChatState {
  const pendingStatuses = { ...state.pendingStatuses };

  delete pendingStatuses[id];

  return {
    messages: state.messages.filter((message) => message.id !== id),
    pendingStatuses,
  };
}
