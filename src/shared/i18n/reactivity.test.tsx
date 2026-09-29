// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { resources } from "./index";
import { AppError, errorText } from "./text";
import { TranslatedText } from "./TranslatedText";
import { SEND_ERROR_MESSAGES } from "@/features/send-message/model/errors";
import { API_ERROR_MESSAGES } from "@/integrations/green-api/api/errors";
import { mapGreenMessage } from "@/integrations/green-api/mapGreenMessage";
import { ChatMessageItem } from "@/widgets/chat-window/ui/ChatMessageItem";
import { OpenChatForm } from "@/features/open-chat/ui/OpenChatForm";

async function setup() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );

  const instance = createInstance();

  // The second locale exists only in this test, not in the application.
  await instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      ...resources,
      de: {
        errors: {
          send: { failed: "Nicht gesendet: {{reason}}" },
          api: { receiveRejected: "Abgelehnt: {{status}}" },
          openChat: { INVALID_PHONE: "Ungültige Telefonnummer" },
        },
        messages: {
          placeholders: { image: "Bild nicht verfügbar" },
          status: { sent: "Gesendet" },
          now: "jetzt",
        },
      },
    },
    interpolation: { escapeValue: false },
  });

  return instance;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("retranslates existing errors, placeholders and statuses without recreating data", async () => {
  const instance = await setup();
  const error = SEND_ERROR_MESSAGES.sendFailed(
    new AppError(API_ERROR_MESSAGES.receiveRejected(429)),
  );
  const message = mapGreenMessage({
    idMessage: "image",
    type: "outgoing",
    typeMessage: "imageMessage",
    statusMessage: "sent",
  });

  render(
    <I18nextProvider i18n={instance}>
      <span>
        <TranslatedText value={error} />
      </span>
      <span>
        <TranslatedText
          value={errorText(new Error("Server detail"), "fallback")}
        />
      </span>
      <ChatMessageItem message={message} deleting={false} onDelete={() => {}} />
    </I18nextProvider>,
  );

  expect(
    screen.getByText(/GREEN API rejected ReceiveNotification/),
  ).toBeTruthy();

  expect(screen.getByText("Images are not displayed yet.")).toBeTruthy();
  expect(screen.getByText("Sent")).toBeTruthy();

  await act(() => instance.changeLanguage("de"));

  expect(screen.getByText("Nicht gesendet: Abgelehnt: 429")).toBeTruthy();
  expect(screen.getByText("Bild nicht verfügbar")).toBeTruthy();
  expect(screen.getByText("Gesendet")).toBeTruthy();
  expect(screen.getByText("jetzt")).toBeTruthy();
  expect(screen.getByText("Server detail")).toBeTruthy();
});

it("retranslates an already displayed Ant Design validation error", async () => {
  const instance = await setup();
  const onOpen = vi.fn();

  render(
    <I18nextProvider i18n={instance}>
      <OpenChatForm loading={false} onOpen={onOpen} />
    </I18nextProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Open chat" }));

  expect(
    await screen.findByText(
      "Enter a phone number with a country code (8–15 digits).",
    ),
  ).toBeTruthy();

  await act(() => instance.changeLanguage("de"));

  expect(await screen.findByText("Ungültige Telefonnummer")).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
});
