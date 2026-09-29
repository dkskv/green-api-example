export type PollingOptions = {
  /** Отмена опроса и ожидания повтора. */
  signal: AbortSignal;
  /** Одна итерация; передаёт сигнал отменяемым операциям. */
  execute: (signal: AbortSignal) => Promise<void>;
  /** Пауза после ошибки, в миллисекундах. */
  retryDelayMs: number;
  /** Обработчик ошибки итерации. */
  onError: (reason: unknown) => void;
};

/** Ждёт задержку или отмену перед повтором. */
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

/** Последовательно опрашивает до отмены, с задержкой только после ошибки. */
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
