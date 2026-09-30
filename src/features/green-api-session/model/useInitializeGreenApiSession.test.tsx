// @vitest-environment jsdom
import { StrictMode, type PropsWithChildren } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { GreenApiChatClient } from "../api/GreenApiChatClient";
import { useInitializeGreenApiSession } from "./useInitializeGreenApiSession";

const credentials = {
  apiUrl: "https://example.com",
  instanceId: "instance",
  apiToken: "token",
};
const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient();
  const onReady = vi.fn();
  const initialize = vi.spyOn(
    GreenApiChatClient.prototype,
    "initializeSession",
  );

  clients.push(queryClient);

  const hook = renderHook(() => useInitializeGreenApiSession(onReady), {
    wrapper: ({ children }: PropsWithChildren) => (
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </StrictMode>
    ),
  });

  return { ...hook, onReady, initialize };
}

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
});

it("blocks duplicate submissions and opens the session only after initialization", async () => {
  const { result, initialize, onReady } = setup();
  let finish!: () => void;

  initialize.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );

  act(() => {
    result.current.mutate(credentials);
    result.current.mutate(credentials);
  });

  await waitFor(() => expect(result.current.isPending).toBe(true));
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(onReady).not.toHaveBeenCalled();
  await act(async () => finish());
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(onReady).toHaveBeenCalledExactlyOnceWith(credentials);
});

it("exposes errors without automatic retries and clears them on a new submission", async () => {
  const { result, initialize, onReady } = setup();
  const failure = new Error("Unavailable");

  initialize.mockRejectedValueOnce(failure);
  act(() => result.current.mutate(credentials));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(failure);
  expect(initialize).toHaveBeenCalledTimes(1);
  expect(onReady).not.toHaveBeenCalled();

  let finish!: () => void;

  initialize.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );

  act(() => result.current.mutate(credentials));
  await waitFor(() => expect(result.current.isPending).toBe(true));
  expect(result.current.error).toBeNull();
  await act(async () => finish());
  await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
});

it.each(["resolve", "reject"])(
  "aborts on unmount and ignores late %s",
  async (outcome) => {
    const { result, initialize, onReady, unmount } = setup();
    let resolve!: () => void;
    let reject!: (error: Error) => void;

    initialize.mockImplementation(
      () =>
        new Promise<void>((yes, no) => {
          resolve = yes;
          reject = no;
        }),
    );

    act(() => result.current.mutate(credentials));
    await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
    const signal = initialize.mock.calls[0][0];

    unmount();
    expect(signal.aborted).toBe(true);

    await act(async () => {
      if (outcome === "resolve") resolve();
      else reject(new Error("Late failure"));
    });

    expect(onReady).not.toHaveBeenCalled();
  },
);
