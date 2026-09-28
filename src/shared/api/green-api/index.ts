export {
  validateTelegramSession,
  enableTelegramNotifications,
  deleteTelegramMessage,
  acknowledgeTelegramNotification,
  checkTelegramAccount,
  getApiError,
  getChatHistory,
  getTelegramSettings,
  receiveTelegramNotification,
  sendTelegramMessage,
} from "./client";
export type {
  CheckAccountResponse,
  GreenApiCredentials,
  GreenMessageDto,
  GreenNotificationDto,
  SendMessageResponse,
  TelegramInstanceSettings,
} from "./types";
