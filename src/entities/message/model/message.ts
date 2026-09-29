export type ChatMessage = {
  id: string;
  text: string;
  placeholder?: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
};
