export function errorText(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}
