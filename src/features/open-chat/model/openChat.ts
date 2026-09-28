import { OPEN_CHAT_ERROR_MESSAGES } from "@/features/open-chat/model/errors";
import { type VerifiedChat } from "@/entities/chat";
import {
  mapGreenMessage,
  sortMessages,
  type ChatMessage,
} from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";

export async function openTelegramChat(
  client: GreenApiClient,
  phone: string,
): Promise<{ chat: VerifiedChat; messages: ChatMessage[] }> {
  const account = await client.checkAccount(Number(phone));

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

  const history = await client.getChatHistory(account.chatId);

  return {
    chat: { phone, chatId: account.chatId },
    messages: sortMessages(history.map(mapGreenMessage)),
  };
}
