import type { DisplayText } from "@/shared/i18n/text";
import { AppError, text } from "@/shared/i18n/text";
import { type ChatClient, type ChatDelivery } from "@/entities/chat";
import { type VerifiedContact } from "@/entities/contact";
import { MESSAGE_STATUS, type ChatMessage } from "@/entities/message";
import { GreenApiClient } from "./api/client";
import { mapGreenMessage } from "./mapGreenMessage";
import { mapGreenNotification } from "./mapGreenNotification";
import { CHAT_HISTORY_LIMIT, WEBHOOK_SETTING } from "./api/constants";
import { GREEN_CHAT_ERROR_MESSAGES } from "./errors";
import { type GreenApiCredentials } from "./credentials";

/** Адаптер GREEN-API к моделям и операциям чата. */
export class GreenApiChatClient implements ChatClient {
  static create(credentials: GreenApiCredentials): ChatClient {
    return new GreenApiChatClient(new GreenApiClient(credentials));
  }

  readonly historyLimit = CHAT_HISTORY_LIMIT;
  private readonly api: GreenApiClient;

  constructor(api: GreenApiClient) {
    this.api = api;
  }

  validateSession(signal?: AbortSignal): Promise<void> {
    return this.api.validateSession(signal);
  }

  async resolveContact(phone: string): Promise<VerifiedContact> {
    const account = await this.api.checkAccount(Number(phone));

    if (account.status === false)
      throw new AppError(
        account.reason ??
          account.data?.reason ??
          GREEN_CHAT_ERROR_MESSAGES.CHECK_FAILED,
      );

    if (!account.exist || !account.chatId)
      throw new AppError(GREEN_CHAT_ERROR_MESSAGES.ACCOUNT_NOT_FOUND);

    return { phone, chatId: account.chatId };
  }

  async getChatHistory(
    chatId: string,
    signal?: AbortSignal,
  ): Promise<ChatMessage[]> {
    const history = await this.api.getChatHistory(chatId, signal);

    return history.map(mapGreenMessage);
  }

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

  deleteMessage(chatId: string, messageId: string): Promise<void> {
    return this.api.deleteMessage(chatId, messageId);
  }

  /** Включает все нужные события, если нет внешнего webhook URL. */
  async prepareNotifications(
    signal: AbortSignal,
  ): Promise<DisplayText | undefined> {
    const settings = await this.api.getSettings(signal);

    signal.throwIfAborted();

    if (settings.webhookUrl.trim())
      throw new AppError(GREEN_CHAT_ERROR_MESSAGES.WEBHOOK_URL_CONFIGURED);

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

    return text("messages:notificationsEnabled");
  }

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
