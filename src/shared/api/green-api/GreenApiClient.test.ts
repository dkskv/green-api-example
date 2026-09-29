import { afterEach, expect, it, vi } from "vitest";
import { GreenApiClient } from "./GreenApiClient";

const client = new GreenApiClient({
  apiUrl: "https://example.com",
  instanceId: "1",
  apiToken: "test",
});

afterEach(() => vi.unstubAllGlobals());

it.each([null, { result: "true" }, { result: true, reason: 123 }])(
  "rejects malformed acknowledgements: %j",
  async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));

    await expect(
      client.acknowledgeNotification(1, new AbortController().signal),
    ).rejects.toThrow("The notification was not acknowledged.");
  },
);

it("accepts a validated acknowledgement", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ result: true })),
  );

  await expect(
    client.acknowledgeNotification(1, new AbortController().signal),
  ).resolves.toBeUndefined();
});

it.each([
  [{ reason: { unexpected: true } }, "HTTP 500"],
  [{ data: { reason: "Unavailable" } }, "HTTP 500: Unavailable"],
])("validates HTTP error bodies: %j", async (payload, message) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(payload, { status: 500 })),
  );

  await expect(client.checkAccount(12345678)).rejects.toThrow(message);
});
