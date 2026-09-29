import { afterEach, describe, expect, it, vi } from "vitest";
import { GreenApiClient } from "@/shared/api/green-api";
import { WEBHOOK_SETTING } from "@/shared/api/green-api";
import { GreenApiChatClient } from "./GreenApiChatClient";
import { mapGreenNotification } from "./mapGreenNotification";

function setup() {
  const api = new GreenApiClient({
    apiUrl: "https://example.com",
    instanceId: "1",
    apiToken: "test",
  });

  return {
    api,
    client: new GreenApiChatClient(api),
    signal: new AbortController().signal,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("GreenApiChatClient", () => {
  it("maps history and sent messages into application models", async () => {
    const { api, client, signal } = setup();

    vi.spyOn(api, "getChatHistory").mockResolvedValue([
      {
        idMessage: "1",
        type: "incoming",
        typeMessage: "textMessage",
        textMessage: "hello",
        timestamp: 12,
      },
      {
        idMessage: "2",
        type: "outgoing",
        statusMessage: "read",
        typeMessage: "imageMessage",
      },
    ]);

    expect(await client.getChatHistory("chat", signal)).toEqual([
      { id: "1", direction: "incoming", text: "hello", timestamp: 12 },
      {
        id: "2",
        direction: "outgoing",
        text: "",
        placeholder: "This message type is not supported yet.",
        timestamp: 0,
        status: "read",
      },
    ]);

    expect(api.getChatHistory).toHaveBeenCalledWith("chat", signal);
    vi.spyOn(api, "sendMessage").mockResolvedValue({ idMessage: "3" });
    vi.spyOn(Date, "now").mockReturnValue(123000);

    expect(await client.sendMessage("chat", "sent")).toEqual({
      id: "3",
      direction: "outgoing",
      text: "sent",
      timestamp: 123,
      status: "pending",
    });
  });

  it("resolves contacts and rejects unavailable accounts", async () => {
    const { api, client } = setup();

    vi.spyOn(api, "checkAccount")
      .mockResolvedValueOnce({ exist: true, chatId: "chat" })
      .mockResolvedValueOnce({ exist: false })
      .mockResolvedValueOnce({ status: false, reason: "unavailable" });

    expect(await client.resolveContact("12345678")).toEqual({
      phone: "12345678",
      chatId: "chat",
    });

    expect(api.checkAccount).toHaveBeenCalledWith(12345678);

    await expect(client.resolveContact("12345678")).rejects.toThrow(
      "No Telegram account was found, or the phone number is hidden by privacy settings.",
    );

    await expect(client.resolveContact("12345678")).rejects.toThrow(
      "unavailable",
    );
  });

  it("keeps receipt IDs inside deliveries and acknowledges ignored events", async () => {
    const { api, client, signal } = setup();

    vi.spyOn(api, "receiveNotification")
      .mockResolvedValueOnce({
        receiptId: 42,
        body: { typeWebhook: "unknown" },
      })
      .mockResolvedValueOnce(null);

    const acknowledge = vi
      .spyOn(api, "acknowledgeNotification")
      .mockResolvedValue();
    const delivery = await client.receiveNotification(signal);

    expect(delivery?.event).toBeNull();
    expect(acknowledge).not.toHaveBeenCalled();
    await delivery!.acknowledge(signal);
    expect(acknowledge).toHaveBeenCalledWith(42, signal);
    expect(await client.receiveNotification(signal)).toBeNull();
  });

  it("enables missing webhook settings and rejects a configured webhook URL", async () => {
    const { api, client, signal } = setup();
    const settings = {
      webhookUrl: "",
      incomingWebhook: WEBHOOK_SETTING.ENABLED,
      outgoingWebhook: WEBHOOK_SETTING.ENABLED,
      outgoingMessageWebhook: WEBHOOK_SETTING.ENABLED,
      outgoingAPIMessageWebhook: WEBHOOK_SETTING.ENABLED,
      deletedMessageWebhook: WEBHOOK_SETTING.ENABLED,
    };

    vi.spyOn(api, "getSettings")
      .mockResolvedValueOnce(settings)
      .mockResolvedValueOnce({
        ...settings,
        incomingWebhook: WEBHOOK_SETTING.DISABLED,
      })
      .mockResolvedValueOnce({
        ...settings,
        webhookUrl: "https://example.com/webhook",
      });

    const enable = vi.spyOn(api, "enableNotifications").mockResolvedValue();

    expect(await client.prepareNotifications(signal)).toBeUndefined();
    expect(enable).not.toHaveBeenCalled();

    expect(await client.prepareNotifications(signal)).toBe(
      "Notifications enabled. GREEN API may take up to 5 minutes to apply the settings and restart the instance.",
    );

    expect(enable).toHaveBeenCalledTimes(1);

    await expect(client.prepareNotifications(signal)).rejects.toThrow(
      "Clear webhookUrl in your GREEN API settings to receive notifications through HTTP polling.",
    );

    expect(enable).toHaveBeenCalledTimes(1);
  });
});

describe("mapGreenNotification", () => {
  it("maps incoming messages, deletions, statuses, and delivery failures", () => {
    expect(
      mapGreenNotification({
        receiptId: 1,
        body: {
          typeWebhook: "incomingMessageReceived",
          senderData: { chatId: "chat" },
          idMessage: "message",
          messageData: {
            typeMessage: "textMessage",
            textMessageData: { textMessage: "hello" },
          },
        },
      }),
    ).toEqual({
      type: "messageReceived",
      chatId: "chat",
      message: {
        id: "message",
        text: "hello",
        direction: "incoming",
        timestamp: 0,
      },
    });

    expect(
      mapGreenNotification({
        receiptId: 1,
        body: {
          typeWebhook: "incomingMessageReceived",
          chatId: "chat",
          messageData: {
            typeMessage: "deletedMessage",
            deletedMessageData: { stanzaId: "message" },
          },
        },
      }),
    ).toEqual({ type: "messageDeleted", chatId: "chat", messageId: "message" });

    expect(
      mapGreenNotification({
        receiptId: 1,
        body: {
          typeWebhook: "outgoingMessageStatus",
          chatId: "chat",
          idMessage: "message",
          status: "read",
        },
      }),
    ).toEqual({
      type: "messageStatusChanged",
      chatId: "chat",
      messageId: "message",
      status: "read",
    });

    expect(
      mapGreenNotification({
        receiptId: 1,
        body: {
          typeWebhook: "outgoingMessageStatus",
          status: "failed",
          description: "rejected",
        },
      }),
    ).toEqual({ type: "deliveryFailed", description: "rejected" });
  });

  it("rejects malformed known notifications", () => {
    expect(() =>
      mapGreenNotification({
        receiptId: 1,
        body: { typeWebhook: "outgoingMessageStatus", status: "read" },
      }),
    ).toThrow("Invalid message status notification.");

    expect(() =>
      mapGreenNotification({
        receiptId: 1,
        body: { typeWebhook: "incomingMessageReceived" },
      }),
    ).toThrow("The notification is missing a chat ID.");
  });
});
