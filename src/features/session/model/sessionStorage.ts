import { credentialsSchema } from "@/shared/api/green-api/types";
import { type GreenApiCredentials } from "@/shared/api/green-api";
import { type VerifiedChat } from "@/entities/chat";

const CREDENTIALS_KEY = "green-api-credentials";
const ACTIVE_CHAT_KEY = "green-api-active-chat";

export function readCredentials(): GreenApiCredentials | null {
  try {
    const saved = localStorage.getItem(CREDENTIALS_KEY);

    return saved ? credentialsSchema.parse(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: GreenApiCredentials): void {
  const previous = readCredentials();

  if (
    previous?.apiUrl !== credentials.apiUrl ||
    previous?.instanceId !== credentials.instanceId
  ) {
    clearSavedChat();
  }

  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function clearSession(): void {
  localStorage.removeItem(CREDENTIALS_KEY);
  localStorage.removeItem(ACTIVE_CHAT_KEY);
}

export function readSavedChat(): VerifiedChat | null {
  try {
    const saved = localStorage.getItem(ACTIVE_CHAT_KEY);

    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<VerifiedChat>;

    return typeof parsed?.phone === "string" &&
      /^[1-9]\d{7,14}$/.test(parsed.phone) &&
      typeof parsed.chatId === "string" &&
      parsed.chatId.length > 0
      ? { phone: parsed.phone, chatId: parsed.chatId }
      : null;
  } catch {
    return null;
  }
}

export function saveActiveChat(chat: VerifiedChat): void {
  localStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify(chat));
}

export function clearSavedChat(): void {
  localStorage.removeItem(ACTIVE_CHAT_KEY);
}
