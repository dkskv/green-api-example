import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Alert, Flex } from "antd";
import { MESSENGER_ERROR_MESSAGES } from "@/pages/messenger/model/errors";
import { OpenChatForm, openTelegramChat } from "@/features/open-chat";
import { readSavedChat, saveActiveChat } from "@/features/session";
import { useReceiveMessages } from "@/features/receive-messages";
import { type VerifiedChat } from "@/entities/chat";
import { MessageStore, mapGreenMessage } from "@/entities/message";
import { type GreenApiClient } from "@/shared/api/green-api";
import { ChatWindow } from "@/widgets/chat-window";

type MessengerPageProps = {
  client: GreenApiClient;
};

export function MessengerPage({ client }: MessengerPageProps) {
  const [store] = useState(() => new MessageStore());
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
  const connection = useReceiveMessages(client, store.receive);
  const messages = useSyncExternalStore(store.subscribe, () =>
    store.getMessages(chat?.chatId ?? ""),
  );

  useEffect(() => {
    mounted.current = true;
    const saved = readSavedChat();
    const controller = new AbortController();
    const requestId = ++historyRequestRef.current;

    if (saved) {
      client
        .getChatHistory(saved.chatId, controller.signal)
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
              MESSENGER_ERROR_MESSAGES.restoreFailed(
                reason instanceof Error
                  ? reason.message
                  : MESSENGER_ERROR_MESSAGES.API_ERROR,
              ),
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
  }, [client, store]);

  async function handleOpen(phone: string): Promise<void> {
    const requestId = ++openRequestRef.current;

    ++historyRequestRef.current;
    setErrorMessage("");
    setIsOpening(true);
    setIsLoadingHistory(false);

    try {
      const result = await openTelegramChat(client, phone);

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
          reason instanceof Error
            ? reason.message
            : MESSENGER_ERROR_MESSAGES.OPEN_FAILED,
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
      const history = await client.getChatHistory(chatId);

      if (!mounted.current) return;

      store.merge(chatId, history.map(mapGreenMessage));
    } catch (reason) {
      if (mounted.current && requestId === historyRequestRef.current)
        setErrorMessage(
          reason instanceof Error
            ? reason.message
            : MESSENGER_ERROR_MESSAGES.REFRESH_FAILED,
        );
    } finally {
      if (mounted.current && requestId === historyRequestRef.current)
        setIsLoadingHistory(false);
    }
  }

  async function deleteMessage(chatId: string, id: string) {
    try {
      await client.deleteMessage(chatId, id);

      if (mounted.current) store.remove(chatId, id);
    } catch (reason) {
      if (mounted.current && activeChatRef.current === chatId)
        setErrorMessage(
          reason instanceof Error
            ? reason.message
            : MESSENGER_ERROR_MESSAGES.DELETE_FAILED,
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
        client={client}
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
