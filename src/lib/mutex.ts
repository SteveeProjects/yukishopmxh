// ==============================================================================
// YUKISHOPMXH — KEYED ASYNC MUTEX (TRANSACTION LOCK & RACE CONDITION SHIELD)
// Serializes concurrent balance, ticket, point, and commission mutations per user
// ==============================================================================

class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait until any active operation on this key completes
    while (this.locks.has(key)) {
      try {
        await this.locks.get(key);
      } catch {
        // Ignore previous task errors to avoid poisoning the mutex chain
      }
    }

    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      if (this.locks.get(key) === lockPromise) {
        this.locks.delete(key);
      }
      resolveLock();
    }
  }
}

export const userMutex = new KeyedMutex();
