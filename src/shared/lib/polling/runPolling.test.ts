import { afterEach, describe, expect, it, vi } from "vitest";
import { runPolling } from ".";

afterEach(() => vi.useRealTimers());

describe("runPolling", () => {
  it("does not start when already aborted", async () => {
    const execute = vi.fn();
    const onError = vi.fn();

    await runPolling({
      signal: AbortSignal.abort(),
      execute,
      retryDelayMs: 1500,
      onError,
    });

    expect(execute).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("waits for each operation before starting the next one", async () => {
    const controller = new AbortController();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const execute = vi
      .fn(async () => {
        await pending;
      })
      .mockImplementationOnce(() => pending)
      .mockImplementationOnce(async () => {
        controller.abort();
      });
    const loop = runPolling({
      signal: controller.signal,
      execute,
      retryDelayMs: 1500,
      onError: vi.fn(),
    });

    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(controller.signal);
    finish();
    await loop;
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("waits before retrying and cancels the retry timer on abort", async () => {
    vi.useFakeTimers();

    const controller = new AbortController();
    const error = new Error("offline");
    const execute = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const loop = runPolling({
      signal: controller.signal,
      execute,
      retryDelayMs: 1500,
      onError,
    });

    await vi.advanceTimersByTimeAsync(1499);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledTimes(2);
    controller.abort();
    await loop;
    expect(vi.getTimerCount()).toBe(0);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("does not report or retry an operation rejected during cancellation", async () => {
    const controller = new AbortController();
    const onError = vi.fn();
    const execute = vi.fn(async (signal: AbortSignal) => {
      controller.abort();
      signal.throwIfAborted();
    });

    await runPolling({
      signal: controller.signal,
      execute,
      retryDelayMs: 1500,
      onError,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
