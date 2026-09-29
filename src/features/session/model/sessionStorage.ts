import { credentialsSchema } from "@/integrations/green-api";
import { type GreenApiCredentials } from "@/integrations/green-api";
import { type VerifiedContact } from "@/entities/contact";

const CREDENTIALS_KEY = "green-api-credentials";
const ACTIVE_CONTACT_KEY = "green-api-active-chat";

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
    clearSavedContact();
  }

  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function clearSession(): void {
  localStorage.removeItem(CREDENTIALS_KEY);
  localStorage.removeItem(ACTIVE_CONTACT_KEY);
}

export function readSavedContact(): VerifiedContact | null {
  try {
    const saved = localStorage.getItem(ACTIVE_CONTACT_KEY);

    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<VerifiedContact>;

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

export function saveActiveContact(contact: VerifiedContact): void {
  localStorage.setItem(ACTIVE_CONTACT_KEY, JSON.stringify(contact));
}

export function clearSavedContact(): void {
  localStorage.removeItem(ACTIVE_CONTACT_KEY);
}
