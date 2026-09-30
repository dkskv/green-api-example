import { MessageStore } from "@/entities/message";
import { expect, it } from "vitest";
import { messageSchema, notificationSchema } from "@/shared/api/green-api";
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
    expect(history.unsupported).toBe(false);

    expect(event).toEqual({
      type: "messageReceived",
      chatId: "chat",
      message: history,
    });
  },
);

it.each([
  "imageMessage",
  "videoMessage",
  "audioMessage",
  "documentMessage",
  "stickerMessage",
  "futureMessage",
  undefined,
])("marks unsupported messages consistently for type %s", (typeMessage) => {
  const history = mapGreenMessage(
    messageSchema.parse({
      idMessage: "1",
      type: "incoming",
      typeMessage,
      textMessage: "unsupported text",
      caption: "photo caption",
    }),
  );
  const event = mapGreenNotification(
    notificationSchema.parse({
      receiptId: 1,
      body: {
        typeWebhook: "incomingMessageReceived",
        idMessage: "1",
        senderData: { chatId: "chat" },
        messageData: {
          typeMessage,
          textMessageData: { textMessage: "unsupported text" },
          fileMessageData: { caption: "photo caption" },
        },
      },
    }),
  );

  expect(history).toMatchObject({
    text: "",
    unsupported: true,
  });

  expect(event).toEqual({
    type: "messageReceived",
    chatId: "chat",
    message: history,
  });
});

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
  ).toMatchObject({ text: "", unsupported: false });
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

it("keeps history messages with unknown statuses without overwriting a known status", () => {
  const store = new MessageStore();
  const message = mapGreenMessage(
    messageSchema.parse({
      idMessage: "1",
      type: "outgoing",
      typeMessage: "textMessage",
      textMessage: "hello",
      statusMessage: "futureStatus",
    }),
  );

  expect(message.status).toBeUndefined();
  store.merge("chat", [{ ...message, status: "read" }]);
  store.merge("chat", [message]);

  expect(store.getMessages("chat")[0]).toMatchObject({
    text: "hello",
    status: "read",
  });
});
