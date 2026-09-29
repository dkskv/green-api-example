type DeletionAttempt = {
  variables?: { id: string };
  error: Error | null;
};

/** Учитывает только последнюю попытку каждого удаления: повтор скрывает старую ошибку. */
export function getDeletionError(
  deletions: readonly DeletionAttempt[],
): Error | null {
  const latestById = new Map(
    deletions.map((attempt) => [attempt.variables?.id, attempt]),
  );

  return (
    [...latestById.values()].findLast((attempt) => attempt.error)?.error ?? null
  );
}
