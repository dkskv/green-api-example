import type { DisplayText } from "@/shared/i18n/text";
import { AppError } from "@/shared/i18n/text";
import { type ChatClient, type ChatDelivery } from "@/entities/chat";
import { type VerifiedContact } from "@/entities/contact";
import { MESSAGE_STATUS, type ChatMessage } from "@/entities/message";
import { type GreenApiClient } from "./api/client";
import { mapGreenMessage } from "./mapGreenMessage";
import { mapGreenNotification } from "./mapGreenNotification";
import { prepareNotifications } from "./prepareNotifications";
import { GREEN_CHAT_ERRORS } from "./errors";
import { getNotificationSettingsNotice } from "./notices";

/** Адаптер GREEN-API к моделям и операциям чата. */
export class GreenApiChatClient implements ChatClient {
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
          GREEN_CHAT_ERRORS.CHECK_FAILED,
      );

    if (!account.exist || !account.chatId)
      throw new AppError(GREEN_CHAT_ERRORS.ACCOUNT_NOT_FOUND);

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

  async prepareNotifications(
    signal: AbortSignal,
  ): Promise<DisplayText | undefined> {
    const changed = await prepareNotifications(this.api, signal);

    return changed ? getNotificationSettingsNotice() : undefined;
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
