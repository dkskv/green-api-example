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
  [MESSAGE_STATUS.PENDING]: "Queued",
  [MESSAGE_STATUS.SENT]: "Sent",
  [MESSAGE_STATUS.DELIVERED]: "Delivered",
  [MESSAGE_STATUS.READ]: "Read",
  [MESSAGE_STATUS.FAILED]: "Failed to send",
  [MESSAGE_STATUS.NO_ACCOUNT]: "Account not found",
};

const DELIVERY_STATUS_ORDER: Partial<Record<MessageStatus, number>> = {
  [MESSAGE_STATUS.PENDING]: 0,
  [MESSAGE_STATUS.SENT]: 1,
  [MESSAGE_STATUS.DELIVERED]: 2,
  [MESSAGE_STATUS.READ]: 3,
};

export function isMessageStatus(status: string): status is MessageStatus {
  return Object.values(MESSAGE_STATUS).some((value) => value === status);
}

export function isFailureStatus(status?: string): boolean {
  return (
    status === MESSAGE_STATUS.FAILED || status === MESSAGE_STATUS.NO_ACCOUNT
  );
}

export function getMessageStatusLabel(status?: string): string | undefined {
  return status && isMessageStatus(status)
    ? MESSAGE_STATUS_LABELS[status]
    : status;
}

export function newerStatus(
  previous?: string,
  next?: string,
): string | undefined {
  if (!next) return previous;

  if (!previous) return next;

  // Successful delivery is conclusive; delayed failures cannot undo it.
  if (isFailureStatus(next)) {
    return previous === MESSAGE_STATUS.DELIVERED ||
      previous === MESSAGE_STATUS.READ
      ? previous
      : next;
  }

  // A queued/sent snapshot cannot clear a failure. Confirmed delivery can.
  if (isFailureStatus(previous)) {
    return next === MESSAGE_STATUS.DELIVERED || next === MESSAGE_STATUS.READ
      ? next
      : previous;
  }

  const previousRank = isMessageStatus(previous)
    ? DELIVERY_STATUS_ORDER[previous]
    : undefined;
  const nextRank = isMessageStatus(next)
    ? DELIVERY_STATUS_ORDER[next]
    : undefined;

  if (
    previousRank !== undefined &&
    nextRank !== undefined &&
    previousRank > nextRank
  )
    return previous;

  return next;
}
