import type { DisplayText } from "@/shared/i18n/text";
import { createStore } from "zustand/vanilla";
import { z } from "zod";
import {
  credentialsSchema,
  type GreenApiCredentials,
} from "@/integrations/green-api";
import { normalizePhoneNumber, type VerifiedContact } from "@/entities/contact";

const CREDENTIALS_KEY = "green-api-credentials";
const ACTIVE_CONTACT_KEY = "green-api-active-chat";
const contactSchema = z.object({
  phone: z.string().refine((phone) => normalizePhoneNumber(phone) === phone),
  chatId: z.string().min(1),
});

export class ContactStore {
  readonly state = createStore<{ contact: VerifiedContact | null }>(() => ({
    contact: null,
  }));

  restore = (): void => {
    let contact: VerifiedContact | null = null;

    try {
      const saved = localStorage.getItem(ACTIVE_CONTACT_KEY);

      if (saved) contact = contactSchema.parse(JSON.parse(saved));
    } catch {
      // Повреждённые или недоступные данные не восстанавливаем.
    }

    this.state.setState({ contact });
  };

  save = (contact: VerifiedContact): void => {
    localStorage.setItem(ACTIVE_CONTACT_KEY, JSON.stringify(contact));
    this.state.setState({ contact });
  };

  clear = (): void => {
    localStorage.removeItem(ACTIVE_CONTACT_KEY);
    this.state.setState({ contact: null });
  };
}

type CredentialsState = {
  credentials: GreenApiCredentials | null;
  verified: boolean;
  sessionErrorMessage: DisplayText;
};

export class CredentialsStore {
  readonly state = createStore<CredentialsState>(() => ({
    credentials: null,
    verified: false,
    sessionErrorMessage: "",
  }));
  private readonly contacts: ContactStore;

  constructor(contacts: ContactStore) {
    this.contacts = contacts;
  }

  restore = (): void => {
    let credentials: GreenApiCredentials | null = null;

    try {
      const saved = localStorage.getItem(CREDENTIALS_KEY);

      if (saved) credentials = credentialsSchema.parse(JSON.parse(saved));
    } catch {
      // Повреждённые или недоступные данные не восстанавливаем.
    }

    this.state.setState({
      credentials,
      verified: false,
      sessionErrorMessage: "",
    });
  };

  save = (credentials: GreenApiCredentials): void => {
    const previous = this.state.getState().credentials;

    if (
      previous?.apiUrl !== credentials.apiUrl ||
      previous?.instanceId !== credentials.instanceId
    ) {
      this.contacts.clear();
    }

    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));

    this.state.setState({
      credentials,
      verified: true,
      sessionErrorMessage: "",
    });
  };

  clear = (): void => {
    localStorage.removeItem(CREDENTIALS_KEY);
    this.contacts.clear();

    this.state.setState({
      credentials: null,
      verified: false,
      sessionErrorMessage: "",
    });
  };

  setVerification = (
    credentials: GreenApiCredentials,
    errorMessage: DisplayText = "",
  ): void => {
    if (this.state.getState().credentials !== credentials) return;

    this.state.setState({
      verified: !errorMessage,
      sessionErrorMessage: errorMessage,
    });
  };
}

export const contactStore = new ContactStore();
export const credentialsStore = new CredentialsStore(contactStore);
