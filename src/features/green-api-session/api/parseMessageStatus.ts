import { z } from "zod";
import { MESSAGE_STATUS, type MessageStatus } from "@/entities/message";

const messageStatusSchema = z.enum(MESSAGE_STATUS);

/** Неизвестные статусы провайдера не меняют состояние сообщения. */
export function parseMessageStatus(value: unknown): MessageStatus | undefined {
  const result = messageStatusSchema.safeParse(value);

  return result.success ? result.data : undefined;
}
