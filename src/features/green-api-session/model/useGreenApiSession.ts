import { GreenApiChatClient } from "../api/GreenApiChatClient";
import { useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { credentialsStore } from "./credentialsStore";
import { acceptVerifiedSession, signOut } from "./sessionActions";

export function useGreenApiSession() {
  const { credentials, verification } = useStore(credentialsStore.state);

  const client = useMemo(
    () => (credentials ? GreenApiChatClient.create(credentials) : null),
    [credentials],
  );

  useEffect(() => {
    if (!client || !credentials || verification !== null) return;

    const controller = new AbortController();

    client
      .validateSession(controller.signal)
      .then(() => {
        if (!controller.signal.aborted)
          credentialsStore.setVerification(credentials, { status: "success" });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          credentialsStore.setVerification(credentials, {
            status: "error",
            error: reason,
          });
        }
      });

    return () => controller.abort();
  }, [client, credentials, verification]);

  return {
    credentials,
    client,
    verification,
    signOut,
    acceptVerifiedSession,
  };
}
