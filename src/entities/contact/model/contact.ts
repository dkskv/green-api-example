export type VerifiedContact = {
  phone: string;
  chatId: string;
};

export function normalizePhoneNumber(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);

  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
