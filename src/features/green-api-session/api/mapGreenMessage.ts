import { parseMessageStatus } from "./parseMessageStatus";
import { type ChatMessage } from "@/entities/message";
import { MESSAGE_TYPE } from "@/shared/api/green-api";
import type { z } from "zod";
import type { messageSchema } from "@/shared/api/green-api";

export function mapGreenMessage(
  data: z.infer<typeof messageSchema>,
): ChatMessage {
  const isText =
    data.typeMessage === MESSAGE_TYPE.TEXT ||
    data.typeMessage === MESSAGE_TYPE.EXTENDED_TEXT;

  return {
    id: data.idMessage,
    text: isText ? (data.textMessage ?? "") : "",
    unsupported: !isText,
    direction: data.type,
    timestamp: data.timestamp ?? 0,
    status: parseMessageStatus(data.statusMessage),
  };
}
