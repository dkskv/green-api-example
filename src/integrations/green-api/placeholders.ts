import { i18n } from "@/shared/i18n";
import { MESSAGE_TYPE } from "./api/constants";

export const MESSAGE_TYPE_PLACEHOLDERS: Readonly<
  Partial<Record<string, string>>
> = {
  [MESSAGE_TYPE.IMAGE]: i18n.t("messages:placeholders.image"),
  [MESSAGE_TYPE.VIDEO]: i18n.t("messages:placeholders.video"),
  [MESSAGE_TYPE.AUDIO]: i18n.t("messages:placeholders.audio"),
  [MESSAGE_TYPE.DOCUMENT]: i18n.t("messages:placeholders.document"),
  [MESSAGE_TYPE.STICKER]: i18n.t("messages:placeholders.sticker"),
};
