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

  if (!phone) throw new Error("Введите номер с кодом страны: от 8 до 15 цифр.");

  const account = await checkTelegramAccount(credentials, Number(phone));

  if (account.status === false) {
    throw new Error(
      account.reason ??
        account.data?.reason ??
        "Telegram не смог проверить номер.",
    );
  }

  if (!account.exist || !account.chatId) {
    throw new Error(
      "Аккаунт Telegram на этом номере не найден или номер скрыт настройками приватности.",
    );
  }

  const history = await getChatHistory(credentials, account.chatId);

  return {
    chat: { phone, chatId: account.chatId },
    messages: sortMessages(history.map(mapGreenMessage)),
  };
}
