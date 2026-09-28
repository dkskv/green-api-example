import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Flex } from "antd";
import { OpenChatForm, openTelegramChat } from "../../../features/open-chat";
import { readSavedChat, saveActiveChat } from "../../../features/session";
import type { VerifiedChat } from "../../../entities/chat";
import {
  mapGreenMessage,
  sortMessages,
  type ChatMessage,
} from "../../../entities/message";
import {
  getChatHistory,
  type GreenApiCredentials,
} from "../../../shared/api/green-api";
import { ChatWindow } from "../../../widgets/chat-window";

type MessengerPageProps = {
  credentials: GreenApiCredentials;
};

export function MessengerPage({ credentials }: MessengerPageProps) {
  const [chat, setChat] = useState<VerifiedChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(() =>
    Boolean(readSavedChat()),
  );
  const [error, setError] = useState("");
  const openRequestRef = useRef(0);

  useEffect(() => {
    const saved = readSavedChat();
    if (!saved) return;

    const controller = new AbortController();
    void getChatHistory(credentials, saved.chatId, controller.signal)
      .then((history) => {
        setChat(saved);
        setMessages(sortMessages(history.map(mapGreenMessage)));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            `Не удалось восстановить историю: ${reason instanceof Error ? reason.message : "ошибка API"}`,
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingHistory(false);
      });

    return () => controller.abort();
  }, [credentials]);

  async function handleOpen(phone: string): Promise<void> {
    const requestId = ++openRequestRef.current;
    setError("");
    setIsOpening(true);
    setIsLoadingHistory(true);
    try {
      const result = await openTelegramChat(credentials, phone);
      if (requestId !== openRequestRef.current) return;
      setChat(result.chat);
      setMessages(result.messages);
      saveActiveChat(result.chat);
    } catch (reason) {
      if (requestId === openRequestRef.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Не удалось открыть Telegram-чат.",
        );
      }
    } finally {
      if (requestId === openRequestRef.current) {
        setIsOpening(false);
        setIsLoadingHistory(false);
      }
    }
  }

  async function refreshHistory(): Promise<void> {
    if (!chat) return;
    const currentChatId = chat.chatId;
    setError("");
    setIsLoadingHistory(true);
    try {
      const history = await getChatHistory(credentials, currentChatId);
      if (chat?.chatId !== currentChatId) return;
      const normalized = sortMessages(history.map(mapGreenMessage));
      setMessages((current) => {
        const historyIds = new Set(normalized.map((message) => message.id));
        return sortMessages([
          ...normalized,
          ...current.filter((message) => !historyIds.has(message.id)),
        ]);
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось обновить историю.",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const appendIncoming = useCallback((message: ChatMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message],
    );
  }, []);

  const appendSent = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  return (
    <Flex vertical gap="middle">
      <OpenChatForm
        loading={isOpening || isLoadingHistory}
        onOpen={handleOpen}
      />
      {error && <Alert type="error" showIcon message={error} />}
      <ChatWindow
        credentials={credentials}
        chat={chat}
        messages={messages}
        loadingHistory={isLoadingHistory}
        error=""
        onRefresh={() => void refreshHistory()}
        onIncoming={appendIncoming}
        onSent={appendSent}
      />
    </Flex>
  );
}
