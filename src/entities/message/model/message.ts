export type ChatMessage = {
  id: string;
  text: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
};
