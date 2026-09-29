import { z } from "zod";

const messageDataSchema = z.object({
  typeMessage: z.string().optional(),
  textMessageData: z.object({ textMessage: z.string().optional() }).optional(),
  fileMessageData: z.object({ caption: z.string().optional() }).optional(),
  extendedTextMessageData: z.object({ text: z.string().optional() }).optional(),
  deletedMessageData: z.object({ stanzaId: z.string().min(1) }).optional(),
});

export const greenMessageSchema = z.object({
  idMessage: z.string().min(1),
  type: z.enum(["incoming", "outgoing"]),
  typeMessage: z.string().optional(),
  timestamp: z.number().nonnegative().optional(),
  textMessage: z.string().optional(),
  statusMessage: z.string().optional(),
  caption: z.string().optional(),
  messageData: messageDataSchema.optional(),
});
export type GreenMessageDto = z.infer<typeof greenMessageSchema>;

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
export type GreenNotificationDto = z.infer<typeof notificationSchema>;

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
export type CheckAccountResponse = z.infer<typeof accountSchema>;

export const settingsSchema = z.object({
  incomingWebhook: z.string(),
  webhookUrl: z.string(),
  outgoingWebhook: z.string(),
  outgoingMessageWebhook: z.string(),
  outgoingAPIMessageWebhook: z.string(),
  deletedMessageWebhook: z.string(),
});
export type TelegramInstanceSettings = z.infer<typeof settingsSchema>;
export const sendMessageSchema = z.object({ idMessage: z.string().min(1) });
export type SendMessageResponse = z.infer<typeof sendMessageSchema>;
