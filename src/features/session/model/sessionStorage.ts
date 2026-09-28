import type { GreenApiCredentials } from "../../../shared/api/green-api";
import type { VerifiedChat } from "../../../entities/chat";

const CREDENTIALS_KEY = "green-api-credentials";
const ACTIVE_CHAT_KEY = "green-api-active-chat";

export function readCredentials(): GreenApiCredentials | null {
  try {
    const saved = localStorage.getItem(CREDENTIALS_KEY);
    return saved ? (JSON.parse(saved) as GreenApiCredentials) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: GreenApiCredentials): void {
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

    // todo: подключить zod
    const parsed = JSON.parse(saved) as Partial<VerifiedChat>;

    return parsed.phone && parsed.chatId
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
