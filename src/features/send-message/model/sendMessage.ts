import { mapGreenMessage } from "../../../entities/message";
import {
  sendTelegramMessage,
  type GreenApiCredentials,
} from "../../../shared/api/green-api";

export async function sendChatMessage(
  credentials: GreenApiCredentials,
  chatId: string,
  text: string,
) {
  const result = await sendTelegramMessage(credentials, chatId, text);
  return mapGreenMessage(
    {
      idMessage: result.idMessage,
      type: "outgoing",
      typeMessage: "textMessage",
      timestamp: Math.floor(Date.now() / 1000),
      textMessage: text,
      statusMessage: "отправлено в Telegram",
    },
    0,
  );
}
