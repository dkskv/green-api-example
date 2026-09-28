import type { GreenMessageDto } from "../../../shared/api/green-api/types";

export type ChatMessage = {
  id: string;
  text: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
};

export function mapGreenMessage(
  data: GreenMessageDto,
  index: number,
): ChatMessage {
  const type = data.typeMessage ?? data.messageData?.typeMessage ?? "unknown";
  const text =
    data.textMessage ??
    data.messageData?.textMessageData?.textMessage ??
    data.messageData?.extendedTextMessageData?.text ??
    data.caption ??
    data.messageData?.fileMessageData?.caption ??
    (type === "imageMessage"
      ? "Изображение пока не отображается"
      : type === "videoMessage"
        ? "Видео пока не отображается"
        : type === "audioMessage"
          ? "Аудио пока не отображается"
          : type === "documentMessage"
            ? "Документ пока не отображается"
            : type === "stickerMessage"
              ? "Стикер пока не отображается"
              : type === "textMessage" || type === "extendedTextMessage"
                ? ""
                : "Сообщение этого типа пока не поддерживается");

  return {
    id: data.idMessage ?? `history-${data.timestamp ?? 0}-${index}`,
    text,
    direction: data.type === "outgoing" ? "outgoing" : "incoming",
    timestamp: data.timestamp ?? 0,
    status: data.statusMessage,
  };
}

export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((left, right) => left.timestamp - right.timestamp);
}
