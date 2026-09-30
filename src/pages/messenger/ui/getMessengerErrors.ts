import { errorText } from "@/shared/ui/errorText";
import { type TFunction } from "i18next";

/** Подготавливает ошибки операций для отображения на странице. */
export function getMessengerErrors(
  errors: {
    contact: Error | null;
    history: Error | null;
    deletion: Error | null;
  },
  t: TFunction<["ui", "errors"]>,
) {
  return [
    {
      operation: "open",
      error: errors.contact,
      fallback: t("errors:messenger.openFailed"),
    },
    {
      operation: "history",
      error: errors.history,
      fallback: t("errors:messenger.refreshFailed"),
    },
    {
      operation: "delete",
      error: errors.deletion,
      fallback: t("errors:messenger.deleteFailed"),
    },
  ]
    .filter(({ error }) => error)
    .map(({ operation, error, fallback }) => ({
      operation,
      message: errorText(error, fallback),
    }));
}
