export interface KeyPoolOptions {
  failureCooldownMs: number;
}

export interface AcquiredProviderKey {
  apiKey: string;
  keyId: string;
}

interface ProviderKeyState {
  apiKey: string;
  keyId: string;
  successCount: number;
  failureCount: number;
  cooldownUntilEpochMs: number;
}

export interface KeyPoolSnapshotItem {
  keyId: string;
  successCount: number;
  failureCount: number;
  cooldownRemainingMs: number;
}

export interface KeyPoolSnapshot {
  configuredKeyCount: number;
  availableKeyCount: number;
  failureCooldownMs: number;
  keys: KeyPoolSnapshotItem[];
}

export class ProviderKeyPool {
  private readonly states: ProviderKeyState[];
  private readonly failureCooldownMs: number;
  private nextIndex = 0;

  constructor(apiKeys: string[], options: KeyPoolOptions) {
    this.failureCooldownMs = options.failureCooldownMs;
    this.states = apiKeys.map((apiKey, index) => ({
      apiKey,
      keyId: `gemini-key-${index + 1}`,
      successCount: 0,
      failureCount: 0,
      cooldownUntilEpochMs: 0,
    }));
  }

  acquireKey(nowEpochMs: number = Date.now()): AcquiredProviderKey {
    const size = this.states.length;
    if (size === 0) {
      throw new Error('No provider API keys configured.');
    }

    for (let offset = 0; offset < size; offset += 1) {
      const index = (this.nextIndex + offset) % size;
      const state = this.states[index];

      if (state.cooldownUntilEpochMs <= nowEpochMs) {
        this.nextIndex = (index + 1) % size;
        return { apiKey: state.apiKey, keyId: state.keyId };
      }
    }

    const nextAvailableInMs = Math.min(
      ...this.states.map((state) => Math.max(0, state.cooldownUntilEpochMs - nowEpochMs))
    );

    throw new Error(`No provider API keys available. Retry in ~${nextAvailableInMs}ms.`);
  }

  reportSuccess(keyId: string): void {
    const state = this.findByKeyId(keyId);
    if (!state) return;

    state.successCount += 1;
    state.cooldownUntilEpochMs = 0;
  }

  reportFailure(keyId: string, nowEpochMs: number = Date.now()): void {
    const state = this.findByKeyId(keyId);
    if (!state) return;

    state.failureCount += 1;
    state.cooldownUntilEpochMs = nowEpochMs + this.failureCooldownMs;
  }

  getSnapshot(nowEpochMs: number = Date.now()): KeyPoolSnapshot {
    const keys: KeyPoolSnapshotItem[] = this.states.map((state) => ({
      keyId: state.keyId,
      successCount: state.successCount,
      failureCount: state.failureCount,
      cooldownRemainingMs: Math.max(0, state.cooldownUntilEpochMs - nowEpochMs),
    }));

    return {
      configuredKeyCount: this.states.length,
      availableKeyCount: keys.filter((entry) => entry.cooldownRemainingMs === 0).length,
      failureCooldownMs: this.failureCooldownMs,
      keys,
    };
  }

  private findByKeyId(keyId: string): ProviderKeyState | undefined {
    return this.states.find((state) => state.keyId === keyId);
  }
}
