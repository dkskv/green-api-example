import { type ChatMessage } from "@/entities/message";
import { MESSAGE_TYPE_PLACEHOLDERS } from "./placeholders";
import { type GreenMessageDto } from "./api/types";

export function mapGreenMessage(data: GreenMessageDto): ChatMessage {
  const type = data.typeMessage ?? data.messageData?.typeMessage ?? "unknown";
  const text =
    data.textMessage ??
    data.messageData?.textMessageData?.textMessage ??
    data.messageData?.extendedTextMessageData?.text ??
    data.caption ??
    data.messageData?.fileMessageData?.caption ??
    MESSAGE_TYPE_PLACEHOLDERS[type] ??
    "This message type is not supported yet.";

  return {
    id: data.idMessage,
    text,
    direction: data.type === "outgoing" ? "outgoing" : "incoming",
    timestamp: data.timestamp ?? 0,
    status: data.statusMessage,
  };
}
