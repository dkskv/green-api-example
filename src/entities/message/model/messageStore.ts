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

export class MessageStore {
  private readonly key: string;
  private chats: Record<string, StoredChat> = {};
  private readonly listeners = new Set<() => void>();

  constructor(credentials: GreenApiCredentials) {
    this.key = messageCacheKey(credentials);

    try {
      const saved = sessionStorage.getItem(this.key);

      if (saved) this.chats = cacheSchema.parse(JSON.parse(saved));
    } catch {
      /* Ignore invalid or unavailable cached data. */
    }
  }

  getMessages(chatId: string): ChatMessage[] {
    return this.chats[chatId]?.messages ?? emptyMessages;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(chatId: string, change: (chat: StoredChat) => StoredChat) {
    const next = {
      ...this.chats,
      [chatId]: change(
        this.chats[chatId] ?? { messages: [], statuses: {}, deleted: [] },
      ),
    };

    // Persist before acknowledging a notification. Failed storage leaves it in the queue.
    sessionStorage.setItem(this.key, JSON.stringify(next));
    this.chats = next;
    this.listeners.forEach((listener) => listener());
  }

  merge(chatId: string, messages: ChatMessage[]) {
    this.update(chatId, (chat) => {
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

  remove(chatId: string, id: string) {
    this.update(chatId, (chat) => ({
      ...chat,
      deleted: [...new Set([...chat.deleted, id])],
      messages: chat.messages.filter((message) => message.id !== id),
    }));
  }

  receive = (notification: GreenNotificationDto) => {
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

      this.update(chatId, (chat) => ({
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

      this.remove(chatId, id);

      return;
    }

    if (!body.idMessage || !body.messageData)
      throw new Error(MESSAGE_ERROR_MESSAGES.INVALID_NOTIFICATION);

    this.merge(chatId, [
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
  };
}
