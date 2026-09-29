import { type ChatClient } from "@/entities/chat";

export function sendChatMessage(
  client: ChatClient,
  chatId: string,
  text: string,
) {
  return client.sendMessage(chatId, text);
}
