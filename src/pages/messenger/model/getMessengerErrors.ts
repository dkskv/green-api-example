import { errorText } from "@/shared/lib/errorText";
import { MESSENGER_ERROR_MESSAGES } from "./errors";

/** Подготавливает ошибки операций для отображения на странице. */
export function getMessengerErrors(errors: {
  contact: Error | null;
  history: Error | null;
  deletion: Error | null;
}) {
  return [
    {
      operation: "open",
      error: errors.contact,
      fallback: MESSENGER_ERROR_MESSAGES.openFailed,
    },
    {
      operation: "history",
      error: errors.history,
      fallback: MESSENGER_ERROR_MESSAGES.refreshFailed,
    },
    {
      operation: "delete",
      error: errors.deletion,
      fallback: MESSENGER_ERROR_MESSAGES.deleteFailed,
    },
  ]
    .filter(({ error }) => error)
    .map(({ operation, error, fallback }) => ({
      operation,
      message: errorText(error, fallback),
    }));
}
