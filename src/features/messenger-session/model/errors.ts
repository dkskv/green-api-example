import { text } from "@/shared/i18n/text";

export const SESSION_ERROR_MESSAGES = {
  INVALID_API_URL: text("errors:session.INVALID_API_URL"),
  MISSING_CREDENTIALS: text("errors:session.MISSING_CREDENTIALS"),
  VERIFICATION_FAILED: text("errors:session.VERIFICATION_FAILED"),
} as const;
