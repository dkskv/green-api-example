import { afterEach, expect, it, vi } from "vitest";
import { GreenApiClient } from "@/shared/api/green-api";
import { runNotificationLoop } from "@/features/receive-messages/model/runNotificationLoop";
import { prepareNotifications } from "@/features/receive-messages/model/prepareNotifications";

vi.mock("@/features/receive-messages/model/prepareNotifications", () => ({
  prepareNotifications: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

it("retries preparation, then preserves it across receive failures and acknowledges after handling", async () => {
  vi.useFakeTimers();

  const controller = new AbortController();
  const client = new GreenApiClient({
    apiUrl: "https://example.com",
    instanceId: "1",
    apiToken: "test",
  });
  const preparationError = new Error("settings unavailable");
  const receiveError = new Error("receive unavailable");
  const notification = {
    receiptId: 1,
    body: { typeWebhook: "incomingMessageReceived" },
  };
  const events: string[] = [];
  const prepare = vi
    .mocked(prepareNotifications)
    .mockRejectedValueOnce(preparationError)
    .mockResolvedValue(true);
  const receive = vi
    .spyOn(client, "receiveNotification")
    .mockRejectedValueOnce(receiveError)
    .mockResolvedValueOnce(notification)
    .mockImplementationOnce(async () => {
      events.push("next receive");
      controller.abort();

      return null;
    });
  const acknowledge = vi
    .spyOn(client, "acknowledgeNotification")
    .mockImplementation(async () => {
      events.push("acknowledge");
    });
  const onSettingsEnabled = vi.fn();
  const onConnectionChange = vi.fn();
  const loop = runNotificationLoop({
    client,
    signal: controller.signal,
    onNotification: () => {
      events.push("handle");
    },
    onConnectionChange,
    onSettingsEnabled,
  });

  await vi.advanceTimersByTimeAsync(0);
  expect(receive).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1500);
  expect(receive).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1500);
  await loop;
  expect(prepare).toHaveBeenCalledTimes(2);
  expect(onSettingsEnabled).toHaveBeenCalledTimes(1);
  expect(events).toEqual(["handle", "acknowledge", "next receive"]);
  expect(acknowledge).toHaveBeenCalledWith(1, controller.signal);

  expect(
    onConnectionChange.mock.calls.map(([connection]) => connection.status),
  ).toEqual(["connecting", "error", "error", "online"]);
});
