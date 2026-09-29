import { i18n } from "@/shared/i18n";
import { type ChatClient, type ChatDelivery } from "@/entities/chat";
import { type VerifiedContact } from "@/entities/contact";
import { MESSAGE_STATUS, type ChatMessage } from "@/entities/message";
import { GreenApiClient } from "@/shared/api/green-api";
import { mapGreenMessage } from "./mapGreenMessage";
import { mapGreenNotification } from "./mapGreenNotification";
import { CHAT_HISTORY_LIMIT, WEBHOOK_SETTING } from "@/shared/api/green-api";
import { GREEN_CHAT_ERROR_MESSAGES } from "./errors";
import { type GreenApiCredentials } from "@/shared/api/green-api";

/** Адаптер GREEN-API к моделям и операциям чата. */
export class GreenApiChatClient implements ChatClient {
  /** Создаёт клиент чата по реквизитам подключения к GREEN-API. */
  static create(credentials: GreenApiCredentials): ChatClient {
    return new GreenApiChatClient(new GreenApiClient(credentials));
  }

  readonly historyLimit = CHAT_HISTORY_LIMIT;
  private readonly api: GreenApiClient;

  /** Принимает HTTP-клиент для выполнения запросов к GREEN-API. */
  constructor(api: GreenApiClient) {
    this.api = api;
  }

  /** Проверяет авторизацию инстанса; при неготовности выбрасывает ошибку. */
  validateSession(signal?: AbortSignal): Promise<void> {
    return this.api.validateSession(signal);
  }

  /** Проверяет наличие аккаунта по номеру и возвращает контакт с chatId. */
  async resolveContact(phone: string): Promise<VerifiedContact> {
    const account = await this.api.checkAccount(Number(phone));

    if (account.status === false)
      throw new Error(
        account.reason ??
          account.data?.reason ??
          GREEN_CHAT_ERROR_MESSAGES.CHECK_FAILED,
      );

    if (!account.exist || !account.chatId)
      throw new Error(GREEN_CHAT_ERROR_MESSAGES.ACCOUNT_NOT_FOUND);

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
   * Включает нужные события перед запуском опроса, если они отключены.
   * @returns Текст уведомления об изменении настроек или undefined, если они уже готовы.
   * @throws Если настроен внешний webhook URL.
   */
  async prepareNotifications(signal: AbortSignal): Promise<string | undefined> {
    const settings = await this.api.getSettings(signal);

    signal.throwIfAborted();

    if (settings.webhookUrl.trim())
      throw new Error(GREEN_CHAT_ERROR_MESSAGES.WEBHOOK_URL_CONFIGURED);

    // Настройки обновляем только если хотя бы одно нужное событие отключено.
    const enabled = [
      settings.incomingWebhook,
      settings.outgoingWebhook,
      settings.outgoingMessageWebhook,
      settings.outgoingAPIMessageWebhook,
      settings.deletedMessageWebhook,
    ].every((value) => value === WEBHOOK_SETTING.ENABLED);

    if (enabled) return undefined;

    await this.api.enableNotifications(signal);

    return i18n.t("messages:notificationsEnabled");
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
