import { errorText } from "@/shared/i18n/text";
import { createGreenApiChatClient } from "@/integrations/green-api";
import { useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { SESSION_ERROR_MESSAGES } from "@/features/session/model/errors";
import { credentialsStore } from "./sessionStorage";

export function useSession() {
  const { credentials, verified, sessionErrorMessage } = useStore(
    credentialsStore.state,
  );
  const client = useMemo(
    () => (credentials ? createGreenApiChatClient(credentials) : null),
    [credentials],
  );

  useEffect(() => {
    if (!client || !credentials || verified) return;

    const controller = new AbortController();

    client
      .validateSession(controller.signal)
      .then(() => {
        if (!controller.signal.aborted)
          credentialsStore.setVerification(credentials);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          credentialsStore.setVerification(
            credentials,
            errorText(reason, SESSION_ERROR_MESSAGES.VERIFICATION_FAILED),
          );
        }
      });

    return () => controller.abort();
  }, [client, credentials, verified]);

  return {
    credentials,
    client,
    verified,
    sessionErrorMessage,
    signOut: credentialsStore.clear,
    acceptVerifiedSession: credentialsStore.save,
  };
}
