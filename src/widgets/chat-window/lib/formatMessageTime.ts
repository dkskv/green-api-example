const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMessageTime(timestamp: number): string {
  return timestamp ? timeFormatter.format(new Date(timestamp * 1000)) : "now";
}
