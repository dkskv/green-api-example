import type { z } from "zod";
import type { notificationSchema } from "./api/schemas";
import { type ChatEvent } from "@/entities/message";
import { isFailureStatus } from "@/entities/message/model/status";
import { WEBHOOK_TYPE, MESSAGE_TYPE } from "./api/constants";
import { mapGreenMessage } from "./mapGreenMessage";
import { GREEN_CHAT_ERROR_MESSAGES } from "./errors";

type GreenNotification = z.infer<typeof notificationSchema>;

type NotificationBody = GreenNotification["body"];

/** Переводит уведомление GREEN-API в событие чата. */
export function mapGreenNotification({
  body,
}: GreenNotification): ChatEvent | null {
  const chatId = body.chatId ?? body.senderData?.chatId;

  switch (body.typeWebhook) {
    case WEBHOOK_TYPE.OUTGOING_MESSAGE_STATUS:
      return mapMessageStatus(body, chatId);
    case WEBHOOK_TYPE.INCOMING_MESSAGE:
    case WEBHOOK_TYPE.OUTGOING_MESSAGE:
    case WEBHOOK_TYPE.OUTGOING_API_MESSAGE:
      return mapMessageNotification(body, chatId);
    default:
      return null;
  }
}

function mapMessageStatus(
  { idMessage, status, description }: NotificationBody,
  chatId: string | undefined,
): ChatEvent {
  if (!idMessage && isFailureStatus(status)) {
    return {
      type: "deliveryFailed",
      chatId,
      description: description ?? status,
    };
  }

  if (!chatId || !idMessage || !status)
    throw new Error(GREEN_CHAT_ERROR_MESSAGES.INVALID_STATUS_NOTIFICATION);

  return {
    type: "messageStatusChanged",
    chatId,
    messageId: idMessage,
    status,
  };
}

function mapMessageNotification(
  { idMessage, typeWebhook, timestamp, messageData }: NotificationBody,
  chatId: string | undefined,
): ChatEvent {
  if (!chatId) throw new Error(GREEN_CHAT_ERROR_MESSAGES.MISSING_CHAT);

  if (messageData?.typeMessage === MESSAGE_TYPE.DELETED) {
    const messageId = messageData.deletedMessageData?.stanzaId;

    if (!messageId)
      throw new Error(GREEN_CHAT_ERROR_MESSAGES.MISSING_DELETED_MESSAGE_ID);

    return { type: "messageDeleted", chatId, messageId };
  }

  if (!idMessage || !messageData)
    throw new Error(GREEN_CHAT_ERROR_MESSAGES.INVALID_NOTIFICATION);

  const direction =
    typeWebhook === WEBHOOK_TYPE.INCOMING_MESSAGE ? "incoming" : "outgoing";
  const text =
    messageData.textMessageData?.textMessage ??
    messageData.extendedTextMessageData?.text;

  return {
    type: "messageReceived",
    chatId,
    message: mapGreenMessage({
      idMessage,
      type: direction,
      timestamp,
      typeMessage: messageData.typeMessage,
      textMessage: text,
      caption: messageData.fileMessageData?.caption,
    }),
  };
}
