export type VerifiedContact = {
  phone: string;
  chatId: string;
};

/** Убирает нецифровые символы и префикс 00; возвращает 8–15 цифр без ведущего нуля или null. */
export function normalizePhoneNumber(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);

  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
