import { type ChatClient } from "@/entities/chat";
import { GreenApiClient } from "./api/client";
import { GreenApiChatClient } from "./GreenApiChatClient";
import { type GreenApiCredentials } from "./credentials";

export function createGreenApiChatClient(
  credentials: GreenApiCredentials,
): ChatClient {
  return new GreenApiChatClient(new GreenApiClient(credentials));
}
