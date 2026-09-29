import type { DisplayText } from "@/shared/i18n/text";
import { text } from "@/shared/i18n/text";
import { MESSAGE_TYPE } from "./api/constants";

export const MESSAGE_TYPE_PLACEHOLDERS: Readonly<
  Partial<Record<string, DisplayText>>
> = {
  [MESSAGE_TYPE.IMAGE]: text("messages:placeholders.image"),
  [MESSAGE_TYPE.VIDEO]: text("messages:placeholders.video"),
  [MESSAGE_TYPE.AUDIO]: text("messages:placeholders.audio"),
  [MESSAGE_TYPE.DOCUMENT]: text("messages:placeholders.document"),
  [MESSAGE_TYPE.STICKER]: text("messages:placeholders.sticker"),
};
