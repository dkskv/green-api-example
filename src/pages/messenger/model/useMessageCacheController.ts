import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCacheController } from "./messageCacheController";

export function useMessageCacheController() {
  const queryClient = useQueryClient();

  return useMemo(() => new MessageCacheController(queryClient), [queryClient]);
}
