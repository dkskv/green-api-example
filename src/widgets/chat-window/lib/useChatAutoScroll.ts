import { useLayoutEffect, useRef, type UIEvent } from "react";
import type { ChatMessage } from "@/entities/message";

const BOTTOM_THRESHOLD = 60;

/** Прокручивает чат к новым сообщениям, только если пользователь находится у нижнего края. */
export function useChatAutoScroll(
  chatId: string | undefined,
  messages: readonly ChatMessage[],
) {
  const historyRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  useLayoutEffect(() => {
    following.current = true;
  }, [chatId]);

  useLayoutEffect(() => {
    const history = historyRef.current;

    if (history && following.current) {
      history.scrollTop = Math.max(
        0,
        history.scrollHeight - history.clientHeight,
      );
    }
  }, [chatId, messages]);

  const onHistoryScroll = (event: UIEvent<HTMLDivElement>) => {
    const history = event.currentTarget;

    // Запоминаем позицию до того, как новое сообщение изменит высоту содержимого.
    following.current =
      history.scrollHeight - history.clientHeight - history.scrollTop <=
      BOTTOM_THRESHOLD;
  };

  return { historyRef, onHistoryScroll };
}
