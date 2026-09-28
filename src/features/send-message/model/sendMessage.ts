import { MESSAGE_STATUS, mapGreenMessage } from "@/entities/message";
import { MESSAGE_TYPE, type GreenApiClient } from "@/shared/api/green-api";

export async function sendChatMessage(
  client: GreenApiClient,
  chatId: string,
  text: string,
) {
  const result = await client.sendMessage(chatId, text);

  return mapGreenMessage({
    idMessage: result.idMessage,
    type: "outgoing",
    typeMessage: MESSAGE_TYPE.TEXT,
    timestamp: Math.floor(Date.now() / 1000),
    textMessage: text,
    statusMessage: MESSAGE_STATUS.PENDING,
  });
}
