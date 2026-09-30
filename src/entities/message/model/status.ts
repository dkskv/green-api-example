import { i18n } from "@/shared/i18n";

export const MESSAGE_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  NO_ACCOUNT: "noAccount",
} as const;

export type MessageStatus =
  (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  [MESSAGE_STATUS.PENDING]: i18n.t("messages:status.pending"),
  [MESSAGE_STATUS.SENT]: i18n.t("messages:status.sent"),
  [MESSAGE_STATUS.DELIVERED]: i18n.t("messages:status.delivered"),
  [MESSAGE_STATUS.READ]: i18n.t("messages:status.read"),
  [MESSAGE_STATUS.FAILED]: i18n.t("messages:status.failed"),
  [MESSAGE_STATUS.NO_ACCOUNT]: i18n.t("messages:status.no_account"),
};

const DELIVERY_STATUS_ORDER: Partial<Record<MessageStatus, number>> = {
  [MESSAGE_STATUS.PENDING]: 0,
  [MESSAGE_STATUS.SENT]: 1,
  [MESSAGE_STATUS.DELIVERED]: 2,
  [MESSAGE_STATUS.READ]: 3,
};

export function isFailureStatus(status?: MessageStatus): boolean {
  return (
    status === MESSAGE_STATUS.FAILED || status === MESSAGE_STATUS.NO_ACCOUNT
  );
}

export function getMessageStatusLabel(
  status?: MessageStatus,
): string | undefined {
  return status ? MESSAGE_STATUS_LABELS[status] : undefined;
}

export function newerStatus(
  previous?: MessageStatus,
  next?: MessageStatus,
): MessageStatus | undefined {
  if (!next) return previous;

  if (!previous) return next;

  // Поздние ошибки не отменяют подтверждённую доставку.
  if (isFailureStatus(next)) {
    return previous === MESSAGE_STATUS.DELIVERED ||
      previous === MESSAGE_STATUS.READ
      ? previous
      : next;
  }

  // Снимок очереди или отправки не снимает ошибку; доставка снимает.
  if (isFailureStatus(previous)) {
    return next === MESSAGE_STATUS.DELIVERED || next === MESSAGE_STATUS.READ
      ? next
      : previous;
  }

  const previousRank = DELIVERY_STATUS_ORDER[previous];
  const nextRank = DELIVERY_STATUS_ORDER[next];

  if (
    previousRank !== undefined &&
    nextRank !== undefined &&
    previousRank > nextRank
  )
    return previous;

  return next;
}
