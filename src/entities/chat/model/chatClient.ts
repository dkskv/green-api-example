import { type ChatMessage, type ChatEvent } from "@/entities/message";
import { type VerifiedContact } from "@/entities/contact";

// A delivery can contain an irrelevant event, but must still be acknowledged.
export interface ChatDelivery {
  event: ChatEvent | null;
  acknowledge(signal: AbortSignal): Promise<void>;
}

export interface ChatClient {
  validateSession(signal?: AbortSignal): Promise<void>;
  resolveContact(phone: string): Promise<VerifiedContact>;
  getChatHistory(chatId: string, signal?: AbortSignal): Promise<ChatMessage[]>;
  sendMessage(chatId: string, text: string): Promise<ChatMessage>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  // Returns an optional user-facing notice after preparing event reception.
  prepareNotifications(signal: AbortSignal): Promise<string | undefined>;
  receiveNotification(signal: AbortSignal): Promise<ChatDelivery | null>;
}
