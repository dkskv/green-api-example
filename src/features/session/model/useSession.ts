import { useEffect, useMemo, useState } from "react";
import { SESSION_ERROR_MESSAGES } from "@/features/session/model/errors";
import {
  clearSession,
  readCredentials,
} from "@/features/session/model/sessionStorage";
import {
  GreenApiClient,
  type GreenApiCredentials,
} from "@/shared/api/green-api";

export function useSession() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(
    readCredentials,
  );
  const client = useMemo(
    () => (credentials ? new GreenApiClient(credentials) : null),
    [credentials],
  );

  const [verified, setVerified] = useState(false);
  const [sessionErrorMessage, setSessionErrorMessage] = useState("");

  useEffect(() => {
    if (!client || verified) return;

    const controller = new AbortController();

    client
      .validateSession(controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setVerified(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setSessionErrorMessage(
            reason instanceof Error
              ? reason.message
              : SESSION_ERROR_MESSAGES.VERIFICATION_FAILED,
          );
      });

    return () => controller.abort();
  }, [client, verified]);

  function signOut(): void {
    setVerified(false);
    setSessionErrorMessage("");
    clearSession();
    setCredentials(null);
  }

  function acceptVerifiedSession(value: GreenApiCredentials): void {
    setVerified(true);
    setCredentials(value);
  }

  return {
    credentials,
    client,
    verified,
    sessionErrorMessage,
    signOut,
    acceptVerifiedSession,
  };
}
