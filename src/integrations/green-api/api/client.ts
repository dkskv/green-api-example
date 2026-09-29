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
  greenMessageSchema,
  notificationSchema,
  settingsSchema,
  sendMessageSchema,
  type CheckAccountResponse,
  type GreenMessageDto,
  type GreenNotificationDto,
  type SendMessageResponse,
  type TelegramInstanceSettings,
} from "./types";

/** HTTP-клиент GREEN-API: запросы и проверка ответов. */
export class GreenApiClient {
  private readonly credentials: Readonly<GreenApiCredentials>;

  constructor(credentials: GreenApiCredentials) {
    this.credentials = { ...credentials };
  }

  async checkAccount(phoneNumber: number): Promise<CheckAccountResponse> {
    const response = await this.post("checkAccount", { phoneNumber });

    return accountSchema.parse(await response.json());
  }

  async getChatHistory(
    chatId: string,
    signal?: AbortSignal,
  ): Promise<GreenMessageDto[]> {
    const response = await this.post(
      "getChatHistory",
      { chatId, count: CHAT_HISTORY_LIMIT },
      signal,
    );
    const data = (await response.json()) as unknown;

    if (!Array.isArray(data))
      throw new Error(API_ERROR_MESSAGES.INVALID_HISTORY);

    return z.array(greenMessageSchema).parse(data);
  }

  async sendMessage(
    chatId: string,
    message: string,
  ): Promise<SendMessageResponse> {
    const response = await this.post("sendMessage", { chatId, message });

    return sendMessageSchema.parse(await response.json());
  }

  async getSettings(signal: AbortSignal): Promise<TelegramInstanceSettings> {
    const response = await this.request("getSettings", { signal });

    return settingsSchema.parse(await response.json());
  }

  async receiveNotification(
    signal: AbortSignal,
  ): Promise<GreenNotificationDto | null> {
    const response = await this.request(
      "receiveNotification",
      { signal },
      "?receiveTimeout=5",
    );
    const raw = (await response.text()).trim();

    if (!raw || raw === "null") return null;

    return notificationSchema.parse(JSON.parse(raw));
  }

  async acknowledgeNotification(
    receiptId: number,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.request(
      "deleteNotification",
      { method: "DELETE", signal },
      `/${receiptId}`,
    );
    const result = (await response.json().catch(() => null)) as {
      result?: boolean;
      reason?: string;
    } | null;

    if (result?.result !== true)
      throw new Error(
        result?.reason || API_ERROR_MESSAGES.NOTIFICATION_NOT_ACKNOWLEDGED,
      );
  }

  async validateSession(signal?: AbortSignal): Promise<void> {
    const response = await this.request("getStateInstance", { signal });
    const { stateInstance } = z
      .object({ stateInstance: z.string() })
      .parse(await response.json());

    if (stateInstance !== INSTANCE_STATE.AUTHORIZED)
      throw new Error(API_ERROR_MESSAGES.instanceNotReady(stateInstance));
  }

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

  async deleteMessage(chatId: string, idMessage: string): Promise<void> {
    // DeleteMessage возвращает HTTP 200 с пустым телом.
    await this.post("deleteMessage", {
      chatId,
      idMessage,
      onlySenderDelete: false,
    });
  }

  private methodUrl(method: string): string {
    const { apiUrl, instanceId, apiToken } = this.credentials;

    return `${apiUrl}/waInstance${encodeURIComponent(instanceId)}/${method}/${encodeURIComponent(apiToken)}`;
  }

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
        throw new Error(API_ERROR_MESSAGES.receiveRejected(response.status));

      throw new Error(await this.getApiError(response));
    }

    return response;
  }

  private async getApiError(response: Response): Promise<string> {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      reason?: string;
      error?: string;
      data?: { reason?: string };
    } | null;
    const reason =
      payload?.reason ??
      payload?.data?.reason ??
      payload?.message ??
      payload?.error;

    return reason
      ? `HTTP ${response.status}: ${reason}`
      : `HTTP ${response.status}`;
  }
}
