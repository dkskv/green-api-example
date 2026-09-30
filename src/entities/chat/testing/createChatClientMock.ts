import { vi } from "vitest";
import { type ChatClient } from "../model/chatClient";

export function createChatClientMock() {
  return {
    historyLimit: 100,
    resolveContact: vi.fn<ChatClient["resolveContact"]>(),
    getChatHistory: vi.fn<ChatClient["getChatHistory"]>(),
    sendMessage: vi.fn<ChatClient["sendMessage"]>(),
    deleteMessage: vi.fn<ChatClient["deleteMessage"]>(),
    receiveNotification: vi.fn<ChatClient["receiveNotification"]>(),
  } satisfies ChatClient;
}
