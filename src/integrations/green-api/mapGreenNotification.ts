import { AppError } from "@/shared/i18n/text";
import type { z } from "zod";
import type { notificationSchema } from "./api/schemas";
import { type ChatEvent } from "@/entities/message";
import { isFailureStatus } from "@/entities/message/model/status";
import { WEBHOOK_TYPE, MESSAGE_TYPE } from "./api/constants";
import { mapGreenMessage } from "./mapGreenMessage";
import { GREEN_CHAT_ERRORS } from "./errors";

export function mapGreenNotification({
  body,
}: z.infer<typeof notificationSchema>): ChatEvent | null {
  const chatId = body.chatId ?? body.senderData?.chatId;

  if (body.typeWebhook === WEBHOOK_TYPE.OUTGOING_MESSAGE_STATUS) {
    if (!body.idMessage && isFailureStatus(body.status)) {
      return {
        type: "deliveryFailed",
        chatId,
        description: body.description ?? body.status,
      };
    }

    if (!chatId || !body.idMessage || !body.status)
      throw new AppError(GREEN_CHAT_ERRORS.INVALID_STATUS_NOTIFICATION);

    return {
      type: "messageStatusChanged",
      chatId,
      messageId: body.idMessage,
      status: body.status,
    };
  }

  if (
    !(
      [
        WEBHOOK_TYPE.INCOMING_MESSAGE,
        WEBHOOK_TYPE.OUTGOING_MESSAGE,
        WEBHOOK_TYPE.OUTGOING_API_MESSAGE,
      ] as readonly string[]
    ).includes(body.typeWebhook)
  )
    return null;

  if (!chatId) throw new AppError(GREEN_CHAT_ERRORS.MISSING_CHAT);

  if (body.messageData?.typeMessage === MESSAGE_TYPE.DELETED) {
    const messageId = body.messageData.deletedMessageData?.stanzaId;

    if (!messageId)
      throw new AppError(GREEN_CHAT_ERRORS.MISSING_DELETED_MESSAGE_ID);

    return { type: "messageDeleted", chatId, messageId };
  }

  if (!body.idMessage || !body.messageData)
    throw new AppError(GREEN_CHAT_ERRORS.INVALID_NOTIFICATION);

  return {
    type: "messageReceived",
    chatId,
    message: mapGreenMessage({
      idMessage: body.idMessage,
      type:
        body.typeWebhook === WEBHOOK_TYPE.INCOMING_MESSAGE
          ? "incoming"
          : "outgoing",
      timestamp: body.timestamp,
      messageData: body.messageData,
    }),
  };
}
