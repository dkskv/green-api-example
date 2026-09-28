import { z } from "zod";
import { newerStatus, isFailureStatus } from "@/entities/message/model/status";
import {
  WEBHOOK_TYPE,
  MESSAGE_TYPE,
  type GreenApiCredentials,
  type GreenNotificationDto,
} from "@/shared/api/green-api";
import { MESSAGE_ERROR_MESSAGES } from "@/entities/message/model/errors";
import {
  mapGreenMessage,
  sortMessages,
  type ChatMessage,
} from "@/entities/message/model/message";

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

    if (body.typeWebhook === WEBHOOK_TYPE.OUTGOING_MESSAGE_STATUS) {
      if (!body.idMessage && isFailureStatus(body.status)) {
        return MESSAGE_ERROR_MESSAGES.sendFailed(
          chatId,
          body.description ?? body.status,
        );
      }

      if (!chatId || !body.idMessage || !body.status)
        throw new Error(MESSAGE_ERROR_MESSAGES.INVALID_STATUS_NOTIFICATION);

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
      !(
        [
          WEBHOOK_TYPE.INCOMING_MESSAGE,
          WEBHOOK_TYPE.OUTGOING_MESSAGE,
          WEBHOOK_TYPE.OUTGOING_API_MESSAGE,
        ] as readonly string[]
      ).includes(body.typeWebhook)
    )
      return;

    if (!chatId) throw new Error(MESSAGE_ERROR_MESSAGES.MISSING_CHAT);

    if (body.messageData?.typeMessage === MESSAGE_TYPE.DELETED) {
      const id = body.messageData.deletedMessageData?.stanzaId;

      if (!id)
        throw new Error(MESSAGE_ERROR_MESSAGES.MISSING_DELETED_MESSAGE_ID);

      remove(chatId, id);

      return;
    }

    if (!body.idMessage || !body.messageData)
      throw new Error(MESSAGE_ERROR_MESSAGES.INVALID_NOTIFICATION);

    merge(chatId, [
      mapGreenMessage({
        idMessage: body.idMessage,
        type:
          body.typeWebhook === WEBHOOK_TYPE.INCOMING_MESSAGE
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
