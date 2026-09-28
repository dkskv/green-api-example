export type GreenApiCredentials = {
  apiUrl: string;
  instanceId: string;
  apiToken: string;
};

export type GreenMessageDto = {
  idMessage?: string;
  type?: "incoming" | "outgoing";
  typeMessage?: string;
  timestamp?: number;
  textMessage?: string;
  statusMessage?: string;
  caption?: string;
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    fileMessageData?: { caption?: string };
    extendedTextMessageData?: { text?: string };
  };
};

export type GreenNotificationDto = {
  receiptId?: number;
  body?: {
    typeWebhook?: string;
    idMessage?: string;
    timestamp?: number;
    senderData?: { chatId?: string };
    messageData?: GreenMessageDto["messageData"];
  };
  status?: string;
  code?: string;
  message?: string;
};

export type CheckAccountResponse = {
  exist?: boolean;
  chatId?: string;
  status?: boolean;
  reason?: string;
  data?: { reason?: string };
};

export type TelegramInstanceSettings = {
  incomingWebhook?: string;
  webhookUrl?: string;
};

export type SendMessageResponse = { idMessage?: string };
