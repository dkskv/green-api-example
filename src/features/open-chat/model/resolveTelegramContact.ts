import { OPEN_CHAT_ERROR_MESSAGES } from "@/features/open-chat/model/errors";
import { type VerifiedContact } from "@/entities/contact";
import { type GreenApiClient } from "@/shared/api/green-api";

export async function resolveTelegramContact(
  client: GreenApiClient,
  phone: string,
): Promise<VerifiedContact> {
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

  return { phone, chatId: account.chatId };
}
