import { OPEN_CHAT_ERROR_MESSAGES } from "@/features/open-chat/model/errors";
import { normalizePhone, type VerifiedChat } from "@/entities/chat";
import {
  mapGreenMessage,
  sortMessages,
  type ChatMessage,
} from "@/entities/message";
import {
  checkTelegramAccount,
  getChatHistory,
  type GreenApiCredentials,
} from "@/shared/api/green-api";

export async function openTelegramChat(
  credentials: GreenApiCredentials,
  rawPhone: string,
): Promise<{ chat: VerifiedChat; messages: ChatMessage[] }> {
  const phone = normalizePhone(rawPhone);

  if (!phone) throw new Error(OPEN_CHAT_ERROR_MESSAGES.INVALID_PHONE);

  const account = await checkTelegramAccount(credentials, Number(phone));

  if (account.status === false) {
    throw new Error(
      account.reason ??
        account.data?.reason ??
        OPEN_CHAT_ERROR_MESSAGES.CHECK_FAILED,
    );
  }

  if (!account.exist || !account.chatId) {
    throw new Error(OPEN_CHAT_ERROR_MESSAGES.ACCOUNT_NOT_FOUND);
  }

  const history = await getChatHistory(credentials, account.chatId);

  return {
    chat: { phone, chatId: account.chatId },
    messages: sortMessages(history.map(mapGreenMessage)),
  };
}
