import { expect, it } from "vitest";
import { mapGreenNotification } from "./mapGreenNotification";
import { notificationSchema } from "@/shared/api/green-api";

it("преобразует входящее сообщение", () => {
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
      unsupported: false,
      direction: "incoming",
      timestamp: 0,
    },
  });
});

it("преобразует удаление сообщения", () => {
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
});

it("преобразует изменение статуса сообщения", () => {
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
});

it("преобразует ошибку доставки", () => {
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

it("отклоняет уведомление о статусе без идентификаторов", () => {
  expect(() =>
    mapGreenNotification({
      receiptId: 1,
      body: { typeWebhook: "outgoingMessageStatus", status: "read" },
    }),
  ).toThrow("INVALID_STATUS_NOTIFICATION");
});

it("отклоняет входящее уведомление без чата", () => {
  expect(() =>
    mapGreenNotification({
      receiptId: 1,
      body: { typeWebhook: "incomingMessageReceived" },
    }),
  ).toThrow("MISSING_CHAT");
});

it.each(["outgoingMessageReceived", "outgoingAPIMessageReceived"])(
  "определяет исходящее направление текста для %s",
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
