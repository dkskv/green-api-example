import { i18n } from "@/shared/i18n";
import { type ChatMessage } from "@/entities/message";
import { MESSAGE_TYPE } from "./api/constants";
import { MESSAGE_TYPE_PLACEHOLDERS } from "./placeholders";
import type { z } from "zod";
import type { messageSchema } from "./api/schemas";

export function mapGreenMessage(
  data: z.infer<typeof messageSchema>,
): ChatMessage {
  const type = data.typeMessage ?? "unknown";
  const text = data.textMessage ?? data.caption ?? "";
  const isText =
    type === MESSAGE_TYPE.TEXT || type === MESSAGE_TYPE.EXTENDED_TEXT;
  const placeholder =
    text || isText
      ? undefined
      : (MESSAGE_TYPE_PLACEHOLDERS[type] ??
        i18n.t("messages:placeholders.unsupported"));

  return {
    id: data.idMessage,
    text,
    placeholder,
    direction: data.type === "outgoing" ? "outgoing" : "incoming",
    timestamp: data.timestamp ?? 0,
    status: data.statusMessage,
  };
}
