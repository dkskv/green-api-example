import { i18n } from "@/shared/i18n";

export const GREEN_API_SESSION_ERROR_MESSAGES = {
  invalidApiUrl: i18n.t("errors:session.invalidApiUrl"),
  missingCredentials: i18n.t("errors:session.missingCredentials"),
  verificationFailed: i18n.t("errors:session.verificationFailed"),
} as const;
