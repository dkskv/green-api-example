import { initializeGreenApiSession } from "./initializeGreenApiSession";
import { type ChatClient, type ChatDelivery } from "@/entities/chat";
import { type VerifiedContact } from "@/entities/contact";
import { MESSAGE_STATUS, type ChatMessage } from "@/entities/message";
import {
  GreenApiClient,
  CHAT_HISTORY_LIMIT,
  type GreenApiCredentials,
} from "@/shared/api/green-api";
import { mapGreenMessage } from "./mapGreenMessage";
import { mapGreenNotification } from "./mapGreenNotification";
import { GREEN_CHAT_ERROR_MESSAGES } from "./errors";

/** Адаптер GREEN-API к моделям и операциям чата. */
export class GreenApiChatClient implements ChatClient {
  /** Создаёт клиент чата по реквизитам подключения к GREEN-API. */
  static create(credentials: GreenApiCredentials): GreenApiChatClient {
    return new GreenApiChatClient(new GreenApiClient(credentials));
  }

  readonly historyLimit = CHAT_HISTORY_LIMIT;
  private readonly api: GreenApiClient;

  /** Принимает HTTP-клиент для выполнения запросов к GREEN-API. */
  constructor(api: GreenApiClient) {
    this.api = api;
  }

  /** Проверяет сессию и готовит получение уведомлений до открытия чата. */
  initializeSession(signal: AbortSignal): Promise<void> {
    return initializeGreenApiSession(this.api, signal);
  }

  /** Проверяет наличие аккаунта по номеру и возвращает контакт с chatId. */
  async resolveContact(phone: string): Promise<VerifiedContact> {
    const account = await this.api.checkAccount(Number(phone));

    if (account.status === false)
      throw new Error(
        account.reason ??
          account.data?.reason ??
          GREEN_CHAT_ERROR_MESSAGES.checkFailed,
      );

    if (!account.exist || !account.chatId)
      throw new Error(GREEN_CHAT_ERROR_MESSAGES.accountNotFound);

    return { phone, chatId: account.chatId };
  }

  /** Загружает историю и преобразует сообщения API в модель чата. */
  async getChatHistory(
    chatId: string,
    signal?: AbortSignal,
  ): Promise<ChatMessage[]> {
    const history = await this.api.getChatHistory(chatId, signal);

    return history.map(mapGreenMessage);
  }

  /** Отправляет текст и возвращает сообщение со статусом ожидания доставки. */
  async sendMessage(chatId: string, text: string): Promise<ChatMessage> {
    const result = await this.api.sendMessage(chatId, text);

    return {
      id: result.idMessage,
      text,
      direction: "outgoing",
      timestamp: Math.floor(Date.now() / 1000),
      status: MESSAGE_STATUS.PENDING,
    };
  }

  /** Удаляет сообщение для всех участников чата через API. */
  deleteMessage(chatId: string, messageId: string): Promise<void> {
    return this.api.deleteMessage(chatId, messageId);
  }

  /**
   * Выполняет один long polling запрос; цикл повторения запускается снаружи.
   * Возвращаемый acknowledge удаляет уведомление из очереди после обработки.
   * @returns Событие с подтверждением (event может быть null для неизвестного типа)
   * или null, если уведомления нет либо после запроса обнаружена отмена.
   */
  async receiveNotification(signal: AbortSignal): Promise<ChatDelivery | null> {
    const notification = await this.api.receiveNotification(signal);

    if (signal.aborted || !notification) return null;

    return {
      event: mapGreenNotification(notification),
      acknowledge: (signal) =>
        this.api.acknowledgeNotification(notification.receiptId, signal),
    };
  }
}
