import { describe, expect, it } from 'vitest';
import { runWithConcurrencyLimit } from './uploadQueue';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('runWithConcurrencyLimit', () => {
  it('runs all tasks while respecting the concurrency limit', async () => {
    let activeTasks = 0;
    let maxActiveTasks = 0;
    const executionOrder: number[] = [];
    const resolvers: Array<() => void> = [];

    const tasks = Array.from({ length: 5 }, (_, index) => async () => {
      activeTasks += 1;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
      executionOrder.push(index);
      await new Promise<void>((resolve) => {
        resolvers[index] = resolve;
      });
      activeTasks -= 1;
    });

    const queuePromise = runWithConcurrencyLimit(tasks, 2);
    await flushMicrotasks();

    expect(maxActiveTasks).toBe(2);
    expect(executionOrder).toEqual([0, 1]);

    resolvers[0]();
    await flushMicrotasks();
    expect(executionOrder).toEqual([0, 1, 2]);

    resolvers[1]();
    resolvers[2]();
    await flushMicrotasks();
    expect(executionOrder).toEqual([0, 1, 2, 3, 4]);

    resolvers[3]();
    resolvers[4]();
    await queuePromise;
    expect(maxActiveTasks).toBe(2);
  });

  it('continues later tasks after one task rejects', async () => {
    const completed: number[] = [];

    await runWithConcurrencyLimit(
      [
        async () => {
          completed.push(1);
        },
        async () => {
          throw new Error('upload failed');
        },
        async () => {
          completed.push(3);
        },
      ],
      1,
    );

    expect(completed).toEqual([1, 3]);
  });
});
