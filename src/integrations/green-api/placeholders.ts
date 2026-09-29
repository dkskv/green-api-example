import { MESSAGE_TYPE } from "./api/constants";

export const MESSAGE_TYPE_PLACEHOLDERS: Readonly<Record<string, string>> = {
  [MESSAGE_TYPE.TEXT]: "",
  [MESSAGE_TYPE.EXTENDED_TEXT]: "",
  [MESSAGE_TYPE.IMAGE]: "Images are not displayed yet.",
  [MESSAGE_TYPE.VIDEO]: "Videos are not displayed yet.",
  [MESSAGE_TYPE.AUDIO]: "Audio is not supported yet.",
  [MESSAGE_TYPE.DOCUMENT]: "Documents are not displayed yet.",
  [MESSAGE_TYPE.STICKER]: "Stickers are not displayed yet.",
};
