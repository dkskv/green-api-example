import type { DisplayText } from "@/shared/i18n/text";
import { AppError } from "@/shared/i18n/text";
import { text } from "@/shared/i18n/text";
import { type GreenApiCredentials } from "../credentials";
import { z } from "zod";
import {
  CHAT_HISTORY_LIMIT,
  INSTANCE_STATE,
  WEBHOOK_SETTING,
} from "./constants";
import { API_ERROR_MESSAGES } from "./errors";
import {
  accountSchema,
  acknowledgementSchema,
  apiErrorSchema,
  messageSchema,
  notificationSchema,
  settingsSchema,
  sendMessageSchema,
} from "./schemas";

/** HTTP-клиент GREEN-API: запросы и проверка ответов. */
export class GreenApiClient {
  private readonly credentials: Readonly<GreenApiCredentials>;

  /** Сохраняет копию реквизитов подключения. */
  constructor(credentials: GreenApiCredentials) {
    this.credentials = { ...credentials };
  }

  /** Проверяет наличие аккаунта по номеру. */
  async checkAccount(phoneNumber: number) {
    const response = await this.post("checkAccount", { phoneNumber });

    return accountSchema.parse(await response.json());
  }

  /** Загружает и проверяет историю чата. */
  async getChatHistory(chatId: string, signal?: AbortSignal) {
    const response = await this.post(
      "getChatHistory",
      { chatId, count: CHAT_HISTORY_LIMIT },
      signal,
    );
    const data: unknown = await response.json();

    if (!Array.isArray(data))
      throw new AppError(API_ERROR_MESSAGES.INVALID_HISTORY);

    return z.array(messageSchema).parse(data);
  }

  /** Отправляет текстовое сообщение. */
  async sendMessage(chatId: string, message: string) {
    const response = await this.post("sendMessage", { chatId, message });

    return sendMessageSchema.parse(await response.json());
  }

  /** Получает настройки инстанса. */
  async getSettings(signal: AbortSignal) {
    const response = await this.request("getSettings", { signal });

    return settingsSchema.parse(await response.json());
  }

  /** Получает следующее уведомление из очереди. */
  async receiveNotification(signal: AbortSignal) {
    const response = await this.request(
      "receiveNotification",
      { signal },
      "?receiveTimeout=5",
    );
    const raw = (await response.text()).trim();

    if (!raw || raw === "null") return null;

    return notificationSchema.parse(JSON.parse(raw));
  }

  /** Подтверждает обработку уведомления. */
  async acknowledgeNotification(
    receiptId: number,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.request(
      "deleteNotification",
      { method: "DELETE", signal },
      `/${receiptId}`,
    );
    const parsed = acknowledgementSchema.safeParse(
      await response.json().catch(() => null),
    );
    const result = parsed.success ? parsed.data : undefined;

    if (result?.result !== true)
      throw new AppError(
        result?.reason || API_ERROR_MESSAGES.NOTIFICATION_NOT_ACKNOWLEDGED,
      );
  }

  /** Проверяет готовность инстанса. */
  async validateSession(signal?: AbortSignal): Promise<void> {
    const response = await this.request("getStateInstance", { signal });
    const { stateInstance } = z
      .object({ stateInstance: z.string() })
      .parse(await response.json());

    if (stateInstance !== INSTANCE_STATE.AUTHORIZED)
      throw new AppError(API_ERROR_MESSAGES.instanceNotReady(stateInstance));
  }

  /** Включает нужные уведомления. */
  async enableNotifications(signal: AbortSignal): Promise<void> {
    const response = await this.post(
      "setSettings",
      {
        incomingWebhook: WEBHOOK_SETTING.ENABLED,
        outgoingWebhook: WEBHOOK_SETTING.ENABLED,
        outgoingMessageWebhook: WEBHOOK_SETTING.ENABLED,
        outgoingAPIMessageWebhook: WEBHOOK_SETTING.ENABLED,
        deletedMessageWebhook: WEBHOOK_SETTING.ENABLED,
      },
      signal,
    );

    z.object({ saveSettings: z.literal(true) }).parse(await response.json());
  }

  /** Удаляет сообщение для всех участников. */
  async deleteMessage(chatId: string, idMessage: string): Promise<void> {
    // DeleteMessage возвращает HTTP 200 с пустым телом.
    await this.post("deleteMessage", {
      chatId,
      idMessage,
      onlySenderDelete: false,
    });
  }

  /** Строит URL метода для текущего инстанса. */
  private methodUrl(method: string): string {
    const { apiUrl, instanceId, apiToken } = this.credentials;

    return `${apiUrl}/waInstance${encodeURIComponent(instanceId)}/${method}/${encodeURIComponent(apiToken)}`;
  }

  /** Отправляет JSON запрос. */
  private post(
    method: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    return this.request(method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  }

  /** Выполняет запрос и обрабатывает HTTP ошибки. */
  private async request(
    method: string,
    init: RequestInit = {},
    suffix = "",
  ): Promise<Response> {
    const response = await fetch(`${this.methodUrl(method)}${suffix}`, init);

    if (!response.ok) {
      if (
        method === "receiveNotification" &&
        response.status >= 400 &&
        response.status < 500
      )
        throw new AppError(API_ERROR_MESSAGES.receiveRejected(response.status));

      throw new AppError(await this.getApiError(response));
    }

    return response;
  }

  /** Извлекает текст ошибки из ответа API. */
  private async getApiError(response: Response): Promise<DisplayText> {
    const parsed = apiErrorSchema.safeParse(
      await response.json().catch(() => null),
    );
    const payload = parsed.success ? parsed.data : undefined;
    const reason =
      payload?.reason ??
      payload?.data?.reason ??
      payload?.message ??
      payload?.error;

    return reason
      ? text("errors:api.httpWithReason", { status: response.status, reason })
      : text("errors:api.http", { status: response.status });
  }
}
