import { afterEach, expect, it } from "vitest";
import { GreenApiError } from "@/shared/api/green-api";
import { i18n } from "@/shared/i18n";
import { errorText } from "./errorText";

const originalOptions = { ...i18n.options };

afterEach(async () => {
  i18n.removeResourceBundle("ru", "errors");
  await i18n.init(originalOptions);
});

it("переводит существующую ошибку на текущий язык", async () => {
  const error = new GreenApiError("RECEIVE_REJECTED", { status: 403 });

  expect(errorText(error, "fallback")).toBe(
    "GREEN API rejected ReceiveNotification (HTTP 403).",
  );

  await i18n.init({ ...originalOptions, supportedLngs: ["en", "ru"] });

  i18n.addResourceBundle("ru", "errors", {
    api: {
      receiveRejected: "Получение уведомлений отклонено (HTTP {{status}}).",
    },
  });

  await i18n.changeLanguage("ru");

  expect(errorText(error, "fallback")).toBe(
    "Получение уведомлений отклонено (HTTP 403).",
  );

  expect(error.code).toBe("RECEIVE_REJECTED");
});

it("сохраняет статус HTTP и причину ошибки провайдера", () => {
  expect(
    errorText(
      new GreenApiError("HTTP_ERROR_WITH_REASON", {
        status: 500,
        reason: "Unavailable",
      }),
      "fallback",
    ),
  ).toBe("HTTP 500: Unavailable");
});

it("сохраняет текст внешних ошибок и использует запасной текст для остальных значений", () => {
  expect(errorText(new Error("Network failed"), "fallback")).toBe(
    "Network failed",
  );

  expect(errorText(undefined, "fallback")).toBe("fallback");
});
