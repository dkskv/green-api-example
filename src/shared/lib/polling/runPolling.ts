export type PollingOptions = {
  signal: AbortSignal;
  execute: (signal: AbortSignal) => Promise<void>;
  retryDelayMs: number;
  onError: (reason: unknown) => void;
};

function pauseBeforeRetry(signal: AbortSignal, delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);

    signal.addEventListener("abort", finish, { once: true });

    if (signal.aborted) finish();
  });
}

// Runs sequentially without a success delay, suitable for long polling.
// execute must pass the signal to any work that needs to be cancelled.
export async function runPolling({
  signal,
  execute,
  retryDelayMs,
  onError,
}: PollingOptions): Promise<void> {
  while (!signal.aborted) {
    try {
      await execute(signal);
    } catch (reason) {
      if (signal.aborted) return;

      onError(reason);

      await pauseBeforeRetry(signal, retryDelayMs);
    }
  }
}
