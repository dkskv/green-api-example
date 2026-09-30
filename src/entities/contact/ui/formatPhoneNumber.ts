import { normalizePhoneNumber } from "../model/contact";

/** Форматирует номера +7 по группам цифр, остальные выводит с префиксом «+». */
export function formatPhoneNumber(value: string): string {
  const phone = normalizePhoneNumber(value);

  if (!phone) return value;

  return /^7\d{10}$/.test(phone)
    ? phone.replace(/^(7)(\d{3})(\d{3})(\d{2})(\d{2})$/, "+$1 $2 $3-$4-$5")
    : `+${phone}`;
}
