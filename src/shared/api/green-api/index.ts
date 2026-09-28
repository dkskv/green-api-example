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
} from "@/shared/api/green-api/client";
export type {
  CheckAccountResponse,
  GreenApiCredentials,
  GreenMessageDto,
  GreenNotificationDto,
  SendMessageResponse,
  TelegramInstanceSettings,
} from "@/shared/api/green-api/types";
export {
  WEBHOOK_TYPE,
  MESSAGE_TYPE,
  INSTANCE_STATE,
  WEBHOOK_SETTING,
} from "@/shared/api/green-api/constants";
