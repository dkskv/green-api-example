import { type ChatClient } from "@/entities/chat";

export function resolveContact(client: ChatClient, phone: string) {
  return client.resolveContact(phone);
}
