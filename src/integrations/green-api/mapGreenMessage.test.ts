import { expect, it } from "vitest";
import { messageSchema, notificationSchema } from "./api/schemas";
import { mapGreenMessage } from "./mapGreenMessage";
import { mapGreenNotification } from "./mapGreenNotification";

it.each([
  [
    "textMessage",
    { textMessage: "hello" },
    { textMessageData: { textMessage: "hello" } },
    "hello",
  ],
  [
    "extendedTextMessage",
    { textMessage: "https://example.com" },
    { extendedTextMessageData: { text: "https://example.com" } },
    "https://example.com",
  ],
  [
    "imageMessage",
    { caption: "photo" },
    { fileMessageData: { caption: "photo" } },
    "photo",
  ],
])(
  "maps %s consistently from history and notifications",
  (typeMessage, historyFields, messageFields, text) => {
    const history = mapGreenMessage(
      messageSchema.parse({
        idMessage: "1",
        type: "incoming",
        timestamp: 12,
        typeMessage,
        ...historyFields,
      }),
    );
    const event = mapGreenNotification(
      notificationSchema.parse({
        receiptId: 1,
        body: {
          typeWebhook: "incomingMessageReceived",
          idMessage: "1",
          timestamp: 12,
          senderData: { chatId: "chat" },
          messageData: { typeMessage, ...messageFields },
        },
      }),
    );

    expect(history.text).toBe(text);
    expect(history.placeholder).toBeUndefined();

    expect(event).toEqual({
      type: "messageReceived",
      chatId: "chat",
      message: history,
    });
  },
);

it.each([
  ["imageMessage", "image"],
  ["videoMessage", "video"],
  ["audioMessage", "audio"],
  ["documentMessage", "document"],
  ["stickerMessage", "sticker"],
  ["futureMessage", "unsupported"],
])(
  "shows a placeholder for %s with an empty caption",
  (typeMessage, placeholder) => {
    const history = mapGreenMessage(
      messageSchema.parse({
        idMessage: "1",
        type: "incoming",
        typeMessage,
        caption: "",
      }),
    );
    const event = mapGreenNotification(
      notificationSchema.parse({
        receiptId: 1,
        body: {
          typeWebhook: "incomingMessageReceived",
          idMessage: "1",
          senderData: { chatId: "chat" },
          messageData: { typeMessage, fileMessageData: { caption: "" } },
        },
      }),
    );

    expect(history.placeholder).toMatchObject({
      key: `messages:placeholders.${placeholder}`,
    });

    expect(event).toEqual({
      type: "messageReceived",
      chatId: "chat",
      message: history,
    });
  },
);

it("does not label an empty text message as unsupported", () => {
  expect(
    mapGreenMessage(
      messageSchema.parse({
        idMessage: "1",
        type: "incoming",
        typeMessage: "textMessage",
        textMessage: "",
      }),
    ),
  ).toMatchObject({ text: "", placeholder: undefined });
});

it.each(["outgoingMessageReceived", "outgoingAPIMessageReceived"])(
  "maps outgoing text direction for %s",
  (typeWebhook) => {
    expect(
      mapGreenNotification(
        notificationSchema.parse({
          receiptId: 1,
          body: {
            typeWebhook,
            idMessage: "1",
            senderData: { chatId: "chat" },
            messageData: {
              typeMessage: "textMessage",
              textMessageData: { textMessage: "sent" },
            },
          },
        }),
      ),
    ).toMatchObject({
      type: "messageReceived",
      message: { direction: "outgoing", text: "sent" },
    });
  },
);
