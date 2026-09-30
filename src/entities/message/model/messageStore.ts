import { boundMethod } from "@/shared/lib/decorators/boundMethod";
import { createStore } from "zustand/vanilla";
import { newerStatus, type MessageStatus } from "./status";
import { type ChatEvent } from "./chatEvent";
import { type ChatMessage } from "./message";

type ChatState = {
  messages: ChatMessage[];
  statuses: Record<string, MessageStatus>;
  deleted: string[];
};

const emptyMessages: ChatMessage[] = [];

export class MessageStore {
  readonly state = createStore<{ chats: Record<string, ChatState> }>(() => ({
    chats: {},
  }));

  /** Возвращает сообщения чата или стабильный пустой массив. */
  getMessages(chatId?: string, state = this.state.getState()): ChatMessage[] {
    return (
      (chatId ? state.chats[chatId]?.messages : undefined) ?? emptyMessages
    );
  }

  /** Обновляет состояние чата. */
  private update(chatId: string, change: (chat: ChatState) => ChatState) {
    this.state.setState(({ chats }) => ({
      chats: {
        ...chats,
        [chatId]: change(
          chats[chatId] ?? { messages: [], statuses: {}, deleted: [] },
        ),
      },
    }));
  }

  /** Объединяет сообщения с учётом статусов и удалений. */
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
        messages: [...byId.values()]
          .filter((message) => !chat.deleted.includes(message.id))
          .sort((left, right) => left.timestamp - right.timestamp),
      };
    });
  }

  /** Удаляет сообщение и запоминает удаление. */
  remove(chatId: string, id: string) {
    this.update(chatId, (chat) => ({
      ...chat,
      deleted: [...new Set([...chat.deleted, id])],
      messages: chat.messages.filter((message) => message.id !== id),
    }));
  }

  /** Применяет изменения сообщений из события чата. */
  @boundMethod
  receive(event: ChatEvent): void {
    switch (event.type) {
      case "messageDeleted":
        this.remove(event.chatId, event.messageId);

        return;
      case "messageReceived":
        this.merge(event.chatId, [event.message]);

        return;
      case "messageStatusChanged": {
        const { chatId, messageId: id, status } = event;

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
    }
  }
}
