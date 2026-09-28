import { z } from "zod";
import { mapGreenMessage, sortMessages, type ChatMessage } from "@/entities/message/model/message";
import type {
  GreenApiCredentials,
  GreenNotificationDto,
} from "@/shared/api/green-api";

const storedChatSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      direction: z.enum(["incoming", "outgoing"]),
      timestamp: z.number(),
      status: z.string().optional(),
    }),
  ),
  statuses: z.record(z.string(), z.string()),
  deleted: z.array(z.string()),
});
type StoredChat = z.infer<typeof storedChatSchema>;
const cacheSchema = z.record(z.string(), storedChatSchema);
const emptyMessages: ChatMessage[] = [];

export function messageCacheKey(credentials: GreenApiCredentials): string {
  return `green-api-messages:${credentials.apiUrl}:${credentials.instanceId}`;
}

function newerStatus(previous?: string, next?: string): string | undefined {
  const rank: Record<string, number> = {
    pending: 0,
    sent: 1,
    delivered: 2,
    read: 3,
  };
  if (!next) return previous;
  if (previous && (rank[previous] ?? -1) > (rank[next] ?? 4)) return previous;
  return next;
}

export function createMessageStore(credentials: GreenApiCredentials) {
  const key = messageCacheKey(credentials);
  let chats: Record<string, StoredChat> = {};
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) chats = cacheSchema.parse(JSON.parse(saved));
  } catch {
    /* Ignore invalid or unavailable cached data. */
  }
  const listeners = new Set<() => void>();

  function update(chatId: string, change: (chat: StoredChat) => StoredChat) {
    const next = {
      ...chats,
      [chatId]: change(
        chats[chatId] ?? { messages: [], statuses: {}, deleted: [] },
      ),
    };
    // Persist before acknowledging a notification. Failed storage leaves it in the queue.
    sessionStorage.setItem(key, JSON.stringify(next));
    chats = next;
    listeners.forEach((listener) => listener());
  }

  function merge(chatId: string, messages: ChatMessage[]) {
    update(chatId, (chat) => {
      const byId = new Map(
        chat.messages.map((message) => [message.id, message]),
      );
      for (const message of messages) {
        const previous = byId.get(message.id);
        byId.set(message.id, {
          ...previous,
          ...message,
          status: newerStatus(
            newerStatus(previous?.status, message.status),
            chat.statuses[message.id],
          ),
        });
      }
      return {
        ...chat,
        messages: sortMessages(
          [...byId.values()].filter(
            (message) => !chat.deleted.includes(message.id),
          ),
        ),
      };
    });
  }

  function remove(chatId: string, id: string) {
    update(chatId, (chat) => ({
      ...chat,
      deleted: [...new Set([...chat.deleted, id])],
      messages: chat.messages.filter((message) => message.id !== id),
    }));
  }

  function receive(notification: GreenNotificationDto) {
    const body = notification.body;
    const chatId = body.chatId ?? body.senderData?.chatId;
    if (body.typeWebhook === "outgoingMessageStatus") {
      if (
        !body.idMessage &&
        ["failed", "noAccount"].includes(body.status ?? "")
      ) {
        return `Ошибка отправки в чат ${chatId ?? "неизвестен"}: ${body.description ?? body.status}`;
      }
      if (!chatId || !body.idMessage || !body.status)
        throw new Error("Некорректное уведомление о статусе сообщения.");
      const id = body.idMessage;
      const status = body.status;
      update(chatId, (chat) => ({
        ...chat,
        statuses: {
          ...chat.statuses,
          [id]: newerStatus(chat.statuses[id], status)!,
        },
        messages: chat.messages.map((message) =>
          message.id === id
            ? { ...message, status: newerStatus(message.status, status) }
            : message,
        ),
      }));
      return;
    }
    if (
      ![
        "incomingMessageReceived",
        "outgoingMessageReceived",
        "outgoingAPIMessageReceived",
      ].includes(body.typeWebhook)
    )
      return;
    if (!chatId) throw new Error("В уведомлении отсутствует чат.");
    if (body.messageData?.typeMessage === "deletedMessage") {
      const id = body.messageData.deletedMessageData?.stanzaId;
      if (!id)
        throw new Error("В уведомлении об удалении отсутствует ID сообщения.");
      remove(chatId, id);
      return;
    }
    if (!body.idMessage || !body.messageData)
      throw new Error("Некорректное уведомление о сообщении.");
    merge(chatId, [
      mapGreenMessage({
        idMessage: body.idMessage,
        type:
          body.typeWebhook === "incomingMessageReceived"
            ? "incoming"
            : "outgoing",
        timestamp: body.timestamp,
        messageData: body.messageData,
      }),
    ]);
  }

  return {
    merge,
    remove,
    receive,
    getMessages: (chatId: string) => chats[chatId]?.messages ?? emptyMessages,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
