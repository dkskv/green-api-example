import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  greenApiCredentialsSchema,
  type GreenApiCredentials,
} from "@/shared/api/green-api";
import { GreenApiChatClient } from "../api/GreenApiChatClient";

type InitializeVariables = {
  values: GreenApiCredentials;
  controller: AbortController;
};

export function useInitializeGreenApiSession(
  onReady: (credentials: GreenApiCredentials) => void,
) {
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const mutation = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async ({ values, controller }: InitializeVariables) => {
      controller.signal.throwIfAborted();
      const credentials = greenApiCredentialsSchema.parse(values);
      const client = GreenApiChatClient.create(credentials);

      await client.initializeSession(controller.signal);
      controller.signal.throwIfAborted();

      return credentials;
    },
    onSuccess: (credentials, { controller }) => {
      if (!controller.signal.aborted) onReady(credentials);
    },
    onSettled: (_, __, { controller }) => {
      if (request.current === controller) request.current = null;
    },
  });

  function mutate(values: GreenApiCredentials) {
    // Блокируем повторную отправку сразу, ещё до следующего рендера.
    if (request.current) return;

    const controller = new AbortController();

    request.current = controller;
    mutation.mutate({ values, controller });
  }

  return {
    mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
