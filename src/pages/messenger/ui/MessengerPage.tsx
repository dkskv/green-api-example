import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Alert, Flex } from "antd";
import { OpenChatForm, openTelegramChat } from "@/features/open-chat";
import { readSavedChat, saveActiveChat } from "@/features/session";
import { useReceiveMessages } from "@/features/receive-messages";
import type { VerifiedChat } from "@/entities/chat";
import { createMessageStore, mapGreenMessage } from "@/entities/message";
import {
  getChatHistory,
  deleteTelegramMessage,
  type GreenApiCredentials,
} from "@/shared/api/green-api";
import { ChatWindow } from "@/widgets/chat-window";

type MessengerPageProps = { credentials: GreenApiCredentials };

export function MessengerPage({ credentials }: MessengerPageProps) {
  const [store] = useState(() => createMessageStore(credentials));
  const [chat, setChat] = useState<VerifiedChat | null>(readSavedChat);
  const [isOpening, setIsOpening] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(() =>
    Boolean(readSavedChat()),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const openRequestRef = useRef(0);
  const historyRequestRef = useRef(0);
  const mounted = useRef(false);
  const activeChatRef = useRef(chat?.chatId);
  const connection = useReceiveMessages(credentials, store.receive);
  const messages = useSyncExternalStore(store.subscribe, () =>
    store.getMessages(chat?.chatId ?? ""),
  );

  useEffect(() => {
    mounted.current = true;
    const saved = readSavedChat();
    const controller = new AbortController();
    const requestId = ++historyRequestRef.current;
    if (saved) {
      getChatHistory(credentials, saved.chatId, controller.signal)
        .then((history) => {
          if (!controller.signal.aborted)
            store.merge(saved.chatId, history.map(mapGreenMessage));
        })
        .catch((reason: unknown) => {
          if (
            !controller.signal.aborted &&
            requestId === historyRequestRef.current
          )
            setErrorMessage(
              `Не удалось восстановить историю: ${reason instanceof Error ? reason.message : "ошибка API"}`,
            );
        })
        .finally(() => {
          if (
            !controller.signal.aborted &&
            requestId === historyRequestRef.current
          )
            setIsLoadingHistory(false);
        });
    }
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, [credentials, store]);

  async function handleOpen(phone: string): Promise<void> {
    const requestId = ++openRequestRef.current;
    ++historyRequestRef.current;
    setErrorMessage("");
    setIsOpening(true);
    setIsLoadingHistory(false);
    try {
      const result = await openTelegramChat(credentials, phone);
      if (!mounted.current || requestId !== openRequestRef.current) return;
      store.merge(result.chat.chatId, result.messages);
      saveActiveChat(result.chat);
      ++historyRequestRef.current;
      setIsLoadingHistory(false);
      activeChatRef.current = result.chat.chatId;
      setChat(result.chat);
    } catch (reason) {
      if (mounted.current && requestId === openRequestRef.current)
        setErrorMessage(
          reason instanceof Error ? reason.message : "Не удалось открыть чат.",
        );
    } finally {
      if (mounted.current && requestId === openRequestRef.current)
        setIsOpening(false);
    }
  }

  async function refreshHistory(): Promise<void> {
    if (!chat) return;
    const chatId = chat.chatId;
    const requestId = ++historyRequestRef.current;
    setErrorMessage("");
    setIsLoadingHistory(true);
    try {
      const history = await getChatHistory(credentials, chatId);
      if (!mounted.current) return;
      store.merge(chatId, history.map(mapGreenMessage));
    } catch (reason) {
      if (mounted.current && requestId === historyRequestRef.current)
        setErrorMessage(
          reason instanceof Error
            ? reason.message
            : "Не удалось обновить историю.",
        );
    } finally {
      if (mounted.current && requestId === historyRequestRef.current)
        setIsLoadingHistory(false);
    }
  }

  async function deleteMessage(chatId: string, id: string) {
    try {
      await deleteTelegramMessage(credentials, chatId, id);
      if (mounted.current) store.remove(chatId, id);
    } catch (reason) {
      if (mounted.current && activeChatRef.current === chatId)
        setErrorMessage(
          reason instanceof Error
            ? reason.message
            : "Не удалось удалить сообщение.",
        );
    }
  }

  return (
    <Flex vertical gap="middle">
      <OpenChatForm loading={isOpening} onOpen={handleOpen} />
      {errorMessage && <Alert type="error" showIcon title={errorMessage} />}
      {connection.deliveryErrorMessage && (
        <Alert type="error" showIcon title={connection.deliveryErrorMessage} />
      )}
      {connection.notice && (
        <Alert type="info" showIcon title={connection.notice} closable />
      )}
      <ChatWindow
        credentials={credentials}
        chat={chat}
        messages={messages}
        loadingHistory={isLoadingHistory}
        errorMessage={connection.errorMessage}
        connectionState={connection.state}
        onRefresh={() => void refreshHistory()}
        onSent={(chatId, message) => {
          if (mounted.current) store.merge(chatId, [message]);
        }}
        onDelete={deleteMessage}
      />
    </Flex>
  );
}
