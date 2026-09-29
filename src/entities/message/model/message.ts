export type ChatMessage = {
  id: string;
  text: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
};

export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.toSorted((left, right) => left.timestamp - right.timestamp);
}
