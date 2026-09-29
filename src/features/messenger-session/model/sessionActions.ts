import type { GreenApiCredentials } from "@/shared/api/green-api";
import { contactStore, type ActiveContactStore } from "./contactStore";
import { credentialsStore, type CredentialsStore } from "./credentialsStore";

export function createSessionActions(
  credentials: CredentialsStore,
  contacts: ActiveContactStore,
) {
  return {
    acceptVerifiedSession(next: GreenApiCredentials): void {
      const previous = credentials.state.getState().credentials;

      if (
        previous?.apiUrl !== next.apiUrl ||
        previous?.instanceId !== next.instanceId
      ) {
        contacts.clear();
      }

      credentials.save(next);
    },
    signOut(): void {
      credentials.clear();
      contacts.clear();
    },
  };
}

export const { acceptVerifiedSession, signOut } = createSessionActions(
  credentialsStore,
  contactStore,
);
