import { i18n } from "@/shared/i18n";

export const SESSION_ERROR_MESSAGES = {
  INVALID_API_URL: i18n.t("errors:session.INVALID_API_URL"),
  MISSING_CREDENTIALS: i18n.t("errors:session.MISSING_CREDENTIALS"),
  VERIFICATION_FAILED: i18n.t("errors:session.VERIFICATION_FAILED"),
} as const;
