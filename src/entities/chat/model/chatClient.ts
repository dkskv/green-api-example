import type { ChatMessage, ChatEvent } from "@/entities/message/@x/chat";
import type { VerifiedContact } from "@/entities/contact/@x/chat";

export interface ChatDelivery {
  /** Событие; null для неподдерживаемого. */
  event: ChatEvent | null;
  /** Подтверждение получения, даже без события. */
  acknowledge(signal: AbortSignal): Promise<void>;
}

export interface ChatClient {
  /** Максимальное число сообщений в истории. */
  readonly historyLimit: number;
  /** Проверка сессии. */
  validateSession(signal?: AbortSignal): Promise<void>;
  /** Проверка контакта по номеру. */
  resolveContact(phone: string): Promise<VerifiedContact>;
  /** Загрузка истории чата. */
  getChatHistory(chatId: string, signal?: AbortSignal): Promise<ChatMessage[]>;
  /** Отправка сообщения. */
  sendMessage(chatId: string, text: string): Promise<ChatMessage>;
  /** Удаление сообщения. */
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  /** Подготовка приёма с необязательным уведомлением. */
  prepareNotifications(signal: AbortSignal): Promise<string | undefined>;
  /** Получение события или пустого результата. */
  receiveNotification(signal: AbortSignal): Promise<ChatDelivery | null>;
}
