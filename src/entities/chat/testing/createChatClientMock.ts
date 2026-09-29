import { vi } from "vitest";
import { type ChatClient } from "../model/chatClient";

export function createChatClientMock() {
  return {
    historyLimit: 100,
    validateSession: vi.fn<ChatClient["validateSession"]>(),
    resolveContact: vi.fn<ChatClient["resolveContact"]>(),
    getChatHistory: vi.fn<ChatClient["getChatHistory"]>(),
    sendMessage: vi.fn<ChatClient["sendMessage"]>(),
    deleteMessage: vi.fn<ChatClient["deleteMessage"]>(),
    prepareNotifications: vi.fn<ChatClient["prepareNotifications"]>(),
    receiveNotification: vi.fn<ChatClient["receiveNotification"]>(),
  } satisfies ChatClient;
}
