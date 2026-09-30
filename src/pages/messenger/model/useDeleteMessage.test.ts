// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";

import { expect, it, vi } from "vitest";

import { useDeleteMessage } from "./useDeleteMessage";

import { setup, deferred } from "./testing/setupMessengerTest";

it("отслеживает несколько удалений и сохраняет позднюю ошибку предыдущего запроса", async () => {
  const { client, messageCacheController, getMessages, wrapper } = setup();
  const first = deferred<void>();
  const second = deferred<void>();

  messageCacheController.merge("a", [
    { id: "first", text: "1", direction: "outgoing", timestamp: 1 },
    { id: "second", text: "2", direction: "outgoing", timestamp: 2 },
  ]);

  vi.spyOn(client, "deleteMessage").mockImplementation((_, id) =>
    id === "first" ? first.promise : second.promise,
  );

  const { result } = renderHook(
    () => useDeleteMessage(client, messageCacheController, "a"),
    {
      wrapper,
    },
  );

  act(() => {
    result.current.deleteMessage("first");
    result.current.deleteMessage("second");
  });

  await waitFor(() =>
    expect(result.current.deletingIds).toEqual(["first", "second"]),
  );

  await act(async () => {
    second.resolve();
    await second.promise;
  });

  await waitFor(() => expect(result.current.deletingIds).toEqual(["first"]));
  act(() => first.reject(new Error("delete failed")));

  await waitFor(() =>
    expect(result.current.deleteError?.message).toBe("delete failed"),
  );

  expect(getMessages("a").map((message) => message.id)).toEqual(["first"]);
});
