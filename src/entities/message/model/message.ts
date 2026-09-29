import type { DisplayText } from "@/shared/i18n/text";

export type ChatMessage = {
  id: string;
  text: string;
  placeholder?: DisplayText;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
};
