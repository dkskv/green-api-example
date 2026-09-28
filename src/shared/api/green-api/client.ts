import { z } from "zod";
import {
  accountSchema,
  greenMessageSchema,
  notificationSchema,
  settingsSchema,
  sendMessageSchema,
} from "@/shared/api/green-api/types";
import type {
  CheckAccountResponse,
  GreenApiCredentials,
  GreenMessageDto,
  GreenNotificationDto,
  SendMessageResponse,
  TelegramInstanceSettings,
} from "@/shared/api/green-api/types";

function instanceUrl(credentials: GreenApiCredentials): string {
  return `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.instanceId)}`;
}

function methodUrl(credentials: GreenApiCredentials, method: string): string {
  return `${instanceUrl(credentials)}/${method}/${encodeURIComponent(credentials.apiToken)}`;
}

export async function getApiError(response: Response): Promise<string> {
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

export async function checkTelegramAccount(
  credentials: GreenApiCredentials,
  phoneNumber: number,
): Promise<CheckAccountResponse> {
  const response = await fetch(methodUrl(credentials, "checkAccount"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!response.ok) throw new Error(await getApiError(response));

  return accountSchema.parse(await response.json());
}

export async function getChatHistory(
  credentials: GreenApiCredentials,
  chatId: string,
  signal?: AbortSignal,
): Promise<GreenMessageDto[]> {
  const response = await fetch(methodUrl(credentials, "getChatHistory"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, count: 100 }),
    signal,
  });

  if (!response.ok) throw new Error(await getApiError(response));

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data))
    throw new Error("Telegram API вернул некорректный формат истории.");

  return z.array(greenMessageSchema).parse(data);
}

export async function sendTelegramMessage(
  credentials: GreenApiCredentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  const response = await fetch(methodUrl(credentials, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  if (!response.ok) throw new Error(await getApiError(response));

  return sendMessageSchema.parse(await response.json());
}

export async function getTelegramSettings(
  credentials: GreenApiCredentials,
  signal: AbortSignal,
): Promise<TelegramInstanceSettings> {
  const response = await fetch(methodUrl(credentials, "getSettings"), {
    signal,
  });

  if (!response.ok) throw new Error(await getApiError(response));

  return settingsSchema.parse(await response.json());
}

export async function receiveTelegramNotification(
  credentials: GreenApiCredentials,
  signal: AbortSignal,
): Promise<GreenNotificationDto | null> {
  const response = await fetch(
    `${methodUrl(credentials, "receiveNotification")}?receiveTimeout=5`,
    { signal },
  );

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new Error(
        `Green API отклонил ReceiveNotification (HTTP ${response.status}).`,
      );
    }
    throw new Error(await getApiError(response));
  }

  const raw = (await response.text()).trim();

  if (!raw || raw === "null") return null;

  return notificationSchema.parse(JSON.parse(raw));
}

export async function acknowledgeTelegramNotification(
  credentials: GreenApiCredentials,
  receiptId: number,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `${instanceUrl(credentials)}/deleteNotification/${encodeURIComponent(credentials.apiToken)}/${receiptId}`,
    { method: "DELETE", signal },
  );

  if (!response.ok) throw new Error(await getApiError(response));

  const result = (await response.json().catch(() => null)) as {
    result?: boolean;
    reason?: string;
  } | null;

  if (result?.result !== true)
    throw new Error(result?.reason || "Уведомление не подтверждено.");
}

export async function validateTelegramSession(
  credentials: GreenApiCredentials,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(methodUrl(credentials, "getStateInstance"), {
    signal,
  });
  if (!response.ok) throw new Error(await getApiError(response));
  const { stateInstance } = z
    .object({ stateInstance: z.string() })
    .parse(await response.json());
  if (stateInstance !== "authorized")
    throw new Error(
      `Инстанс не готов к работе: ${stateInstance}. Авторизуйте его в GREEN API.`,
    );
}

export async function enableTelegramNotifications(
  credentials: GreenApiCredentials,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(methodUrl(credentials, "setSettings"), {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      incomingWebhook: "yes",
      outgoingWebhook: "yes",
      outgoingMessageWebhook: "yes",
      outgoingAPIMessageWebhook: "yes",
      deletedMessageWebhook: "yes",
    }),
  });
  if (!response.ok) throw new Error(await getApiError(response));
  z.object({ saveSettings: z.literal(true) }).parse(await response.json());
}

export async function deleteTelegramMessage(
  credentials: GreenApiCredentials,
  chatId: string,
  idMessage: string,
): Promise<void> {
  const response = await fetch(methodUrl(credentials, "deleteMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, idMessage, onlySenderDelete: false }),
  });
  if (!response.ok) throw new Error(await getApiError(response));
  // DeleteMessage returns HTTP 200 with an empty body.
}
