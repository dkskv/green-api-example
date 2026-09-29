import { createStore } from "zustand/vanilla";
import { newerStatus } from "@/entities/message/model/status";
import { type ChatEvent } from "./chatEvent";
import { MESSAGE_ERROR_MESSAGES } from "@/entities/message/model/errors";
import { type ChatMessage } from "@/entities/message/model/message";

type ChatState = {
  messages: ChatMessage[];
  statuses: Record<string, string>;
  deleted: string[];
};

export const emptyMessages: ChatMessage[] = [];

export class MessageStore {
  readonly state = createStore<{ chats: Record<string, ChatState> }>(() => ({
    chats: {},
  }));

  getMessages(chatId: string): ChatMessage[] {
    return this.state.getState().chats[chatId]?.messages ?? emptyMessages;
  }

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

  remove(chatId: string, id: string) {
    this.update(chatId, (chat) => ({
      ...chat,
      deleted: [...new Set([...chat.deleted, id])],
      messages: chat.messages.filter((message) => message.id !== id),
    }));
  }

  receive = (event: ChatEvent) => {
    switch (event.type) {
      case "deliveryFailed":
        return MESSAGE_ERROR_MESSAGES.sendFailed(
          event.chatId,
          event.description,
        );
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
  };
}
