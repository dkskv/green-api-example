export type VerifiedContact = {
  phone: string;
  chatId: string;
};

export function normalizePhoneNumber(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);

  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** Format +7 numbers for display; keep other country codes unchanged. */
export function formatPhoneNumber(value: string): string {
  const phone = normalizePhoneNumber(value);

  if (!phone) return value;

  return /^7\d{10}$/.test(phone)
    ? phone.replace(/^(7)(\d{3})(\d{3})(\d{2})(\d{2})$/, "+$1 $2 $3-$4-$5")
    : `+${phone}`;
}
