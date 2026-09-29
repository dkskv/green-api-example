import { z } from "zod";

const messageDataSchema = z.object({
  typeMessage: z.string().optional(),
  textMessageData: z.object({ textMessage: z.string().optional() }).optional(),
  extendedTextMessageData: z.object({ text: z.string().optional() }).optional(),
  deletedMessageData: z.object({ stanzaId: z.string().min(1) }).optional(),
});

export const messageSchema = z.object({
  idMessage: z.string().min(1),
  type: z.enum(["incoming", "outgoing"]),
  typeMessage: z.string().optional(),
  timestamp: z.number().nonnegative().optional(),
  textMessage: z.string().optional(),
  statusMessage: z.string().optional(),
});

export const notificationSchema = z.object({
  receiptId: z.number().int().nonnegative(),
  body: z.object({
    typeWebhook: z.string(),
    idMessage: z.string().optional(),
    timestamp: z.number().nonnegative().optional(),
    chatId: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    senderData: z.object({ chatId: z.string() }).optional(),
    messageData: messageDataSchema.optional(),
  }),
});

export const accountSchema = z
  .object({
    exist: z.boolean().optional(),
    chatId: z.string().optional(),
    status: z.boolean().optional(),
    reason: z.string().optional(),
    data: z.object({ reason: z.string().optional() }).optional(),
  })
  .refine(
    (value) => value.status === false || typeof value.exist === "boolean",
  );

export const settingsSchema = z.object({
  incomingWebhook: z.string(),
  webhookUrl: z.string(),
  outgoingWebhook: z.string(),
  outgoingMessageWebhook: z.string(),
  outgoingAPIMessageWebhook: z.string(),
  deletedMessageWebhook: z.string(),
});

export const sendMessageSchema = z.object({ idMessage: z.string().min(1) });

/** Ответ подтверждения получения уведомления. */
export const acknowledgementSchema = z.object({
  result: z.boolean().optional(),
  reason: z.string().optional(),
});

/** Доступные поля ошибки HTTP API. */
export const apiErrorSchema = z.object({
  message: z.string().optional(),
  reason: z.string().optional(),
  error: z.string().optional(),
  data: z.object({ reason: z.string().optional() }).optional(),
});
