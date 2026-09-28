import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Layout,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import "antd/dist/reset.css";

type Credentials = {
  apiUrl: string;
  instanceId: string;
  apiToken: string;
};

type Message = {
  id: string;
  text: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
};

type GreenMessage = {
  idMessage?: string;
  type?: "incoming" | "outgoing";
  typeMessage?: string;
  timestamp?: number;
  textMessage?: string;
  statusMessage?: string;
  caption?: string;
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    fileMessageData?: { caption?: string };
    extendedTextMessageData?: { text?: string };
  };
};

type Notification = {
  receiptId?: number;
  body?: {
    typeWebhook?: string;
    idMessage?: string;
    timestamp?: number;
    senderData?: { chatId?: string };
    messageData?: GreenMessage["messageData"];
  };
  status?: string;
  code?: string;
  message?: string;
};

type AccountCheckResult = {
  exist?: boolean;
  chatId?: string;
  status?: boolean;
  reason?: string;
  data?: { reason?: string };
};

type InstanceSettings = {
  incomingWebhook?: string;
  webhookUrl?: string;
};

type SavedChat = { phone: string; chatId: string };

const DEFAULT_API_URL = "https://api.green-api.com";
const CREDENTIALS_KEY = "green-api-credentials";
const ACTIVE_CHAT_KEY = "green-api-active-chat";
// TODO: Remove persistent browser storage after development; credentials belong behind a server-side auth boundary.

function readCredentials(): Credentials | null {
  try {
    const saved = localStorage.getItem(CREDENTIALS_KEY);
    return saved ? (JSON.parse(saved) as Credentials) : null;
  } catch {
    return null;
  }
}

function readSavedChat(): SavedChat | null {
  try {
    const saved = localStorage.getItem(ACTIVE_CHAT_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<SavedChat>;
    return parsed.phone && parsed.chatId
      ? { phone: parsed.phone, chatId: parsed.chatId }
      : null;
  } catch {
    return null;
  }
}

function normalizePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

function messageFromGreen(data: GreenMessage, index: number): Message {
  const type = data.typeMessage ?? data.messageData?.typeMessage ?? "unknown";
  const text =
    data.textMessage ??
    data.messageData?.textMessageData?.textMessage ??
    data.messageData?.extendedTextMessageData?.text ??
    data.caption ??
    data.messageData?.fileMessageData?.caption ??
    (type === "imageMessage"
      ? "Изображение пока не отображается"
      : type === "videoMessage"
        ? "Видео пока не отображается"
        : type === "audioMessage"
          ? "Аудио пока не отображается"
          : type === "documentMessage"
            ? "Документ пока не отображается"
            : type === "stickerMessage"
              ? "Стикер пока не отображается"
              : type === "textMessage" || type === "extendedTextMessage"
                ? ""
                : "Сообщение этого типа пока не поддерживается");

  return {
    id: data.idMessage ?? `history-${data.timestamp ?? 0}-${index}`,
    text,
    direction: data.type === "outgoing" ? "outgoing" : "incoming",
    timestamp: data.timestamp ?? 0,
    status: data.statusMessage,
  };
}

async function getApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    reason?: string;
    error?: string;
    data?: { reason?: string };
  } | null;
  const reason =
    payload?.reason ??
    payload?.data?.reason ??
    payload?.message ??
    payload?.error;
  return reason
    ? `HTTP ${response.status}: ${reason}`
    : `HTTP ${response.status}`;
}

async function fetchChatHistory(
  credentials: Credentials,
  chatId: string,
): Promise<Message[]> {
  const response = await fetch(
    `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.instanceId)}/getChatHistory/${encodeURIComponent(credentials.apiToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, count: 100 }),
    },
  );
  if (!response.ok) throw new Error(await getApiError(response));
  const history = (await response.json()) as unknown;
  if (!Array.isArray(history)) {
    throw new Error("Telegram API вернул некорректный формат истории.");
  }
  return (history as GreenMessage[])
    .map(messageFromGreen)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(
    readCredentials,
  );
  const [apiUrlInput, setApiUrlInput] = useState(DEFAULT_API_URL);
  const [instanceIdInput, setInstanceIdInput] = useState("");
  const [apiTokenInput, setApiTokenInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [activePhone, setActivePhone] = useState("");
  const [activeChatId, setActiveChatId] = useState("");
  const [messagesByChat, setMessagesByChat] = useState<
    Record<string, Message[]>
  >({});
  const [draft, setDraft] = useState("");
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(() =>
    Boolean(readCredentials() && readSavedChat()),
  );
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "online" | "error"
  >(activeChatId ? "connecting" : "idle");
  const [connectionError, setConnectionError] = useState("");
  const activeChatRef = useRef("");
  const openRequestRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = activeChatId ? (messagesByChat[activeChatId] ?? []) : [];

  useEffect(() => {
    if (!activeChatId || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeChatId, messages.length]);

  useEffect(() => {
    if (!credentials) return;
    const saved = readSavedChat();
    if (!saved) return;

    let cancelled = false;
    const requestId = ++openRequestRef.current;
    void fetchChatHistory(credentials, saved.chatId)
      .then((history) => {
        if (cancelled || requestId !== openRequestRef.current) return;
        activeChatRef.current = saved.chatId;
        setPhoneInput(saved.phone);
        setActivePhone(saved.phone);
        setActiveChatId(saved.chatId);
        setMessagesByChat((previous) => ({
          ...previous,
          [saved.chatId]: history,
        }));
      })
      .catch((error: unknown) => {
        if (cancelled || requestId !== openRequestRef.current) return;
        localStorage.removeItem(ACTIVE_CHAT_KEY);
        setFormError(
          `Не удалось восстановить историю: ${error instanceof Error ? error.message : "ошибка API"}`,
        );
      })
      .finally(() => {
        if (!cancelled && requestId === openRequestRef.current) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
      if (openRequestRef.current === requestId) openRequestRef.current += 1;
    };
  }, [credentials]);

  useEffect(() => {
    if (!credentials || !activeChatId) return;

    const pollCredentials = credentials;
    const pollingChatId = activeChatId;
    let stopped = false;
    const controller = new AbortController();
    const base = `${pollCredentials.apiUrl}/waInstance${encodeURIComponent(pollCredentials.instanceId)}`;
    const receiveUrl = `${base}/receiveNotification/${encodeURIComponent(pollCredentials.apiToken)}?receiveTimeout=5`;

    async function receiveLoop(): Promise<void> {
      setConnectionState("connecting");
      try {
        const settingsResponse = await fetch(
          `${base}/getSettings/${encodeURIComponent(pollCredentials.apiToken)}`,
          { signal: controller.signal },
        );
        if (!settingsResponse.ok)
          throw new Error(await getApiError(settingsResponse));
        const settings = (await settingsResponse.json()) as InstanceSettings;
        if (settings.webhookUrl?.trim()) {
          setConnectionState("error");
          setConnectionError(
            "Для HTTP-приёма Telegram в Green API Console очистите webhookUrl. Сейчас настроена доставка на внешний webhook.",
          );
          return;
        }
        if (settings.incomingWebhook !== "yes") {
          setConnectionState("error");
          setConnectionError(
            "Включите «Получать уведомления о входящих сообщениях и файлах» в настройках Telegram-инстанса (incomingWebhook = yes).",
          );
          return;
        }
      } catch (error) {
        if (
          stopped ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        setConnectionState("error");
        setConnectionError(
          `Не удалось проверить настройки приёма: ${error instanceof Error ? error.message : "ошибка API"}`,
        );
        return;
      }

      while (!stopped) {
        try {
          const response = await fetch(receiveUrl, {
            signal: controller.signal,
          });
          if (!response.ok) {
            if (response.status >= 400 && response.status < 500) {
              setConnectionState("error");
              setConnectionError(
                `Green API отклонил запрос (HTTP ${response.status}). Проверьте настройки инстанса и credentials.`,
              );
              break;
            }
            throw new Error(await getApiError(response));
          }
          const raw = await response.text();
          if (!raw || raw === "null") {
            setConnectionState("online");
            setConnectionError("");
            continue;
          }

          const notification = JSON.parse(raw) as Notification;
          if (
            notification.status === "error" ||
            (!notification.body && notification.message)
          ) {
            throw new Error(
              notification.message ??
                notification.code ??
                "Ошибка ReceiveNotification.",
            );
          }

          const body = notification.body;
          if (
            body?.typeWebhook === "incomingMessageReceived" &&
            body.senderData?.chatId === pollingChatId
          ) {
            const incoming = messageFromGreen(
              {
                idMessage: body.idMessage,
                type: "incoming",
                timestamp: body.timestamp,
                messageData: body.messageData,
              },
              0,
            );
            setMessagesByChat((previous) => {
              const current = previous[pollingChatId] ?? [];
              if (current.some((message) => message.id === incoming.id))
                return previous;
              return { ...previous, [pollingChatId]: [...current, incoming] };
            });
          }

          if (notification.receiptId !== undefined) {
            const deleteResponse = await fetch(
              `${base}/deleteNotification/${encodeURIComponent(pollCredentials.apiToken)}/${notification.receiptId}`,
              { method: "DELETE", signal: controller.signal },
            );
            if (!deleteResponse.ok)
              throw new Error(await getApiError(deleteResponse));
            const acknowledgement = (await deleteResponse
              .json()
              .catch(() => null)) as {
              result?: boolean;
              reason?: string;
            } | null;
            if (acknowledgement?.result === false) {
              throw new Error(
                acknowledgement.reason || "Уведомление не подтверждено.",
              );
            }
          }

          setConnectionState("online");
          setConnectionError("");
        } catch (error) {
          if (
            stopped ||
            (error instanceof DOMException && error.name === "AbortError")
          )
            break;
          setConnectionState("error");
          setConnectionError(
            `Проблема приёма уведомлений. Повторяем подключение. ${error instanceof Error ? error.message : ""}`,
          );
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      }
    }

    void receiveLoop();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [credentials, activeChatId]);

  function signIn(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextCredentials = {
      apiUrl: apiUrlInput.trim().replace(/\/+$/, ""),
      instanceId: instanceIdInput.trim(),
      apiToken: apiTokenInput.trim(),
    };
    try {
      const parsedApiUrl = new URL(nextCredentials.apiUrl);
      if (parsedApiUrl.protocol !== "https:")
        throw new Error("HTTPS is required");
      nextCredentials.apiUrl = parsedApiUrl.origin;
    } catch {
      setFormError("Укажите корректный HTTPS API URL.");
      return;
    }
    if (!nextCredentials.instanceId || !nextCredentials.apiToken) {
      setFormError("Укажите ID инстанса и API token.");
      return;
    }
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(nextCredentials));
    setCredentials(nextCredentials);
    setFormError("");
  }

  function signOut(): void {
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem(ACTIVE_CHAT_KEY);
    openRequestRef.current += 1;
    activeChatRef.current = "";
    setCredentials(null);
    setConnectionState("idle");
    setConnectionError("");
    setActivePhone("");
    setActiveChatId("");
    setMessagesByChat({});
    setDraft("");
    setFormError("");
    setInstanceIdInput("");
    setApiTokenInput("");
    setApiUrlInput(DEFAULT_API_URL);
  }

  async function openChat(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!credentials) return;
    const phone = normalizePhone(phoneInput);
    if (!phone) {
      setFormError("Введите номер с кодом страны: от 8 до 15 цифр.");
      return;
    }

    const requestId = ++openRequestRef.current;
    setFormError("");
    setIsCheckingAccount(true);
    setIsLoadingHistory(true);

    try {
      const endpoint = `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.instanceId)}`;
      const checkResponse = await fetch(
        `${endpoint}/checkAccount/${encodeURIComponent(credentials.apiToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: Number(phone) }),
        },
      );
      if (!checkResponse.ok) throw new Error(await getApiError(checkResponse));
      const account = (await checkResponse.json()) as AccountCheckResult;
      if (requestId !== openRequestRef.current) return;
      if (account.status === false) {
        throw new Error(
          account.reason ??
            account.data?.reason ??
            "Telegram не смог проверить номер.",
        );
      }
      if (!account.exist || !account.chatId) {
        throw new Error(
          "Аккаунт Telegram на этом номере не найден или номер скрыт настройками приватности.",
        );
      }

      const normalized = await fetchChatHistory(credentials, account.chatId);
      if (requestId !== openRequestRef.current) return;
      activeChatRef.current = account.chatId;
      setActivePhone(phone);
      setActiveChatId(account.chatId);
      localStorage.setItem(
        ACTIVE_CHAT_KEY,
        JSON.stringify({ phone, chatId: account.chatId }),
      );
      setMessagesByChat((previous) => ({
        ...previous,
        [account.chatId!]: normalized,
      }));
    } catch (error) {
      if (requestId === openRequestRef.current) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Не удалось открыть Telegram-чат.",
        );
      }
    } finally {
      if (requestId === openRequestRef.current) {
        setIsCheckingAccount(false);
        setIsLoadingHistory(false);
      }
    }
  }

  async function refreshHistory(): Promise<void> {
    if (!activeChatId || !credentials) return;
    const chatId = activeChatId;
    setIsLoadingHistory(true);
    setFormError("");
    try {
      const normalized = await fetchChatHistory(credentials, chatId);
      if (activeChatRef.current !== chatId) return;
      setMessagesByChat((previous) => {
        const liveMessages = previous[chatId] ?? [];
        const historyIds = new Set(normalized.map((message) => message.id));
        return {
          ...previous,
          [chatId]: [
            ...normalized,
            ...liveMessages.filter((message) => !historyIds.has(message.id)),
          ].sort((left, right) => left.timestamp - right.timestamp),
        };
      });
    } catch (error) {
      if (activeChatRef.current === chatId) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Не удалось обновить историю.",
        );
      }
    } finally {
      if (activeChatRef.current === chatId) setIsLoadingHistory(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = draft.trim();
    if (!credentials || !activeChatId || !text || isSending) return;
    const chatId = activeChatId;
    setIsSending(true);
    setFormError("");
    try {
      const response = await fetch(
        `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.instanceId)}/sendMessage/${encodeURIComponent(credentials.apiToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, message: text }),
        },
      );
      if (!response.ok) throw new Error(await getApiError(response));
      const result = (await response.json()) as { idMessage?: string };
      const sent: Message = {
        id: result.idMessage ?? `sent-${Date.now()}`,
        text,
        direction: "outgoing",
        timestamp: Math.floor(Date.now() / 1000),
        status: "отправлено в Telegram",
      };
      setMessagesByChat((previous) => ({
        ...previous,
        [chatId]: [...(previous[chatId] ?? []), sent],
      }));
      setDraft("");
    } catch (error) {
      setFormError(
        `Сообщение не отправлено. Текст сохранён. ${error instanceof Error ? error.message : "Попробуйте ещё раз."}`,
      );
    } finally {
      setIsSending(false);
    }
  }

  const connectionLabel = {
    idle: "Чат не открыт",
    connecting: "Подключение",
    online: "Приём активен",
    error: "Приём остановлен",
  }[connectionState];

  return (
    <AntApp>
      <Layout style={{ minHeight: "100vh" }}>
        <Layout.Header>
          <Flex align="center" justify="space-between">
            <Typography.Title level={4} style={{ margin: 0, color: "inherit" }}>
              Telegram
            </Typography.Title>
            {credentials && (
              <Space>
                {activeChatId && (
                  <Tag
                    color={
                      connectionState === "online"
                        ? "green"
                        : connectionState === "error"
                          ? "red"
                          : "default"
                    }
                  >
                    {connectionLabel}
                  </Tag>
                )}
                <Button onClick={signOut}>Выйти</Button>
              </Space>
            )}
          </Flex>
        </Layout.Header>

        <Layout.Content
          style={{ width: "min(1100px, 100%)", margin: "0 auto", padding: 24 }}
        >
          {!credentials ? (
            <Card
              title="Открыть сессию"
              style={{ width: "min(440px, 100%)", margin: "7vh auto 0" }}
            >
              <Typography.Paragraph type="secondary">
                Введите данные Telegram-инстанса Green API.
              </Typography.Paragraph>
              <form onSubmit={signIn}>
                <Flex vertical gap="middle">
                  <label style={{ display: "grid", gap: 6 }}>
                    <Typography.Text>API URL</Typography.Text>
                    <Input
                      type="url"
                      value={apiUrlInput}
                      onChange={(event) => setApiUrlInput(event.target.value)}
                      placeholder="https://api.green-api.com"
                      required
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <Typography.Text>ID инстанса</Typography.Text>
                    <Input
                      value={instanceIdInput}
                      onChange={(event) =>
                        setInstanceIdInput(event.target.value)
                      }
                      placeholder="4100XXXXXXXX"
                      required
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <Typography.Text>API token</Typography.Text>
                    <Input.Password
                      value={apiTokenInput}
                      onChange={(event) => setApiTokenInput(event.target.value)}
                      placeholder="Введите токен"
                      required
                    />
                  </label>
                  {formError && (
                    <Alert type="error" showIcon message={formError} />
                  )}
                  <Button type="primary" htmlType="submit" block>
                    Продолжить
                  </Button>
                </Flex>
              </form>
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
                message="Credentials временно сохраняются в localStorage только для разработки. Удалить перед production."
              />
            </Card>
          ) : (
            <Flex vertical gap="middle">
              <Card title="Новый диалог">
                <Typography.Paragraph type="secondary">
                  Введите номер в международном формате.
                </Typography.Paragraph>
                <form onSubmit={(event) => void openChat(event)}>
                  <Flex gap="small">
                    <Input
                      aria-label="Номер телефона"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+7 999 123-45-67"
                      value={phoneInput}
                      onChange={(event) => setPhoneInput(event.target.value)}
                    />
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={isCheckingAccount || isLoadingHistory}
                    >
                      Открыть чат
                    </Button>
                  </Flex>
                </form>
              </Card>

              <Card
                title={activePhone ? `+${activePhone}` : "Номер не выбран"}
                extra={
                  activeChatId && (
                    <Button
                      onClick={() => void refreshHistory()}
                      loading={isLoadingHistory}
                    >
                      Обновить историю
                    </Button>
                  )
                }
              >
                {connectionError && (
                  <Alert type="warning" showIcon message={connectionError} />
                )}
                {formError && (
                  <Alert type="error" showIcon message={formError} />
                )}

                <div
                  ref={scrollRef}
                  aria-live="polite"
                  style={{
                    maxHeight: "60vh",
                    minHeight: 280,
                    overflowY: "auto",
                  }}
                >
                  {!activeChatId ? (
                    <Empty description="Откройте чат по номеру телефона" />
                  ) : isLoadingHistory && messages.length === 0 ? (
                    <Flex justify="center" style={{ padding: 32 }}>
                      <Spin tip="Загружаем историю…" />
                    </Flex>
                  ) : messages.length === 0 ? (
                    <Empty description="История пуста. Начните диалог сообщением." />
                  ) : (
                    <>
                      <Typography.Text
                        type="secondary"
                        style={{
                          display: "block",
                          marginBottom: 12,
                          textAlign: "center",
                        }}
                      >
                        Последние 100 сообщений. Старая история не подгружается.
                      </Typography.Text>
                      <List
                        split={false}
                        dataSource={messages}
                        renderItem={(message) => (
                          <List.Item
                            key={message.id}
                            style={{
                              justifyContent:
                                message.direction === "outgoing"
                                  ? "flex-end"
                                  : "flex-start",
                              border: 0,
                            }}
                          >
                            <Card
                              size="small"
                              style={{
                                maxWidth: "78%",
                                background:
                                  message.direction === "outgoing"
                                    ? "#f6ffed"
                                    : undefined,
                              }}
                            >
                              <Typography.Paragraph
                                style={{ margin: 0, whiteSpace: "pre-wrap" }}
                              >
                                {message.text ||
                                  "Сообщение без текстового содержимого"}
                              </Typography.Paragraph>
                              <Flex
                                justify="flex-end"
                                gap={8}
                                style={{ marginTop: 6 }}
                              >
                                <Typography.Text type="secondary">
                                  {message.timestamp
                                    ? new Date(
                                        message.timestamp * 1000,
                                      ).toLocaleTimeString("ru-RU", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "сейчас"}
                                </Typography.Text>
                                {message.direction === "outgoing" && (
                                  <Typography.Text type="secondary">
                                    {message.status}
                                  </Typography.Text>
                                )}
                              </Flex>
                            </Card>
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                </div>

                <form onSubmit={(event) => void sendMessage(event)}>
                  <Flex
                    gap="small"
                    style={{
                      alignItems: "flex-end",
                      borderTop: "1px solid #f0f0f0",
                      paddingTop: 12,
                    }}
                  >
                    <Input.TextArea
                      aria-label="Текст сообщения"
                      placeholder={
                        activeChatId
                          ? "Написать сообщение…"
                          : "Сначала откройте чат"
                      }
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={!activeChatId}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                    />
                    <Button
                      type="primary"
                      htmlType="submit"
                      disabled={!activeChatId || !draft.trim()}
                      loading={isSending}
                    >
                      Отправить
                    </Button>
                  </Flex>
                </form>
              </Card>
            </Flex>
          )}
        </Layout.Content>
      </Layout>
    </AntApp>
  );
}

export default App;
