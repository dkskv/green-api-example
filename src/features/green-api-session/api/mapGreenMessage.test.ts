import { mergeMessages } from "@/entities/message";
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
  "одинаково преобразует %s из истории и уведомлений",
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

it.each(["imageMessage", "futureMessage", undefined])(
  "одинаково помечает неподдерживаемые сообщения типа %s",
  (typeMessage) => {
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
  },
);

it("не помечает пустое текстовое сообщение как неподдерживаемое", () => {
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

it("сохраняет сообщения истории с неизвестным статусом без перезаписи известного статуса", () => {
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
  const state = mergeMessages(undefined, [{ ...message, status: "read" }]);
  const updated = mergeMessages(state, [message]);

  expect(updated.messages[0]).toMatchObject({
    text: "hello",
    status: "read",
  });
});
