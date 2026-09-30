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

export function isFailureStatus(status?: MessageStatus): boolean {
  return (
    status === MESSAGE_STATUS.FAILED || status === MESSAGE_STATUS.NO_ACCOUNT
  );
}

const STATUS_PRIORITY: Record<MessageStatus, number> = {
  [MESSAGE_STATUS.PENDING]: 0,
  [MESSAGE_STATUS.SENT]: 1,
  [MESSAGE_STATUS.FAILED]: 2,
  [MESSAGE_STATUS.NO_ACCOUNT]: 2,
  [MESSAGE_STATUS.DELIVERED]: 3,
  [MESSAGE_STATUS.READ]: 4,
};

/**
 * Предотвращает откат статуса, когда история и уведомления приходят не по порядку.
 * Подтверждённая доставка имеет приоритет над ошибкой.
 */
export function newerStatus(
  previous?: MessageStatus,
  next?: MessageStatus,
): MessageStatus | undefined {
  if (!next) return previous;

  if (!previous) return next;

  return STATUS_PRIORITY[previous] > STATUS_PRIORITY[next] ? previous : next;
}
