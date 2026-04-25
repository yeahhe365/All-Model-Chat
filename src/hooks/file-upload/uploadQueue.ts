export const runWithConcurrencyLimit = async (tasks: Array<() => Promise<void>>, limit: number): Promise<void> => {
  const normalizedLimit = Math.max(1, Math.floor(limit));
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(normalizedLimit, tasks.length) }, async () => {
    while (nextIndex < tasks.length) {
      const task = tasks[nextIndex];
      nextIndex += 1;
      try {
        await task();
      } catch {
        // Individual upload tasks already surface errors in their own file cards.
      }
    }
  });

  await Promise.all(workers);
};
