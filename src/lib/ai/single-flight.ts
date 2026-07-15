type ActiveSingleFlightJob<Progress, Result> = {
  key: string;
  listeners: Set<(progress: Progress) => void>;
  promise: Promise<Result>;
};

export class SingleFlightCache<Progress, Result> {
  private active: ActiveSingleFlightJob<Progress, Result> | null = null;
  private readonly recent = new Map<string, { expiresAt: number; result: Result }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number, maxEntries: number) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  availability(key: string) {
    this.removeExpired(key);
    if (!this.active) return "available" as const;
    return this.active.key === key ? "join" as const : "busy" as const;
  }

  async run(input: {
    key: string;
    listener: (progress: Progress) => void;
    work: (emit: (progress: Progress) => void) => Promise<Result>;
  }) {
    this.removeExpired(input.key);
    const cached = this.recent.get(input.key);
    if (cached) return cached.result;

    if (this.active) {
      if (this.active.key !== input.key) throw new Error("PROCESSING_BUSY");
      const joined = this.active;
      joined.listeners.add(input.listener);
      try {
        return await joined.promise;
      } finally {
        joined.listeners.delete(input.listener);
      }
    }

    const listeners = new Set<(progress: Progress) => void>([input.listener]);
    const job: ActiveSingleFlightJob<Progress, Result> = {
      key: input.key,
      listeners,
      promise: Promise.resolve(undefined as Result)
    };
    this.active = job;
    job.promise = input.work((progress) => {
      for (const listener of listeners) listener(progress);
    }).then((result) => {
      this.recent.set(input.key, { expiresAt: Date.now() + this.ttlMs, result });
      while (this.recent.size > this.maxEntries) this.recent.delete(this.recent.keys().next().value!);
      return result;
    }).finally(() => {
      if (this.active === job) this.active = null;
    });

    try {
      return await job.promise;
    } finally {
      listeners.delete(input.listener);
    }
  }

  private removeExpired(key: string) {
    const cached = this.recent.get(key);
    if (cached && cached.expiresAt <= Date.now()) this.recent.delete(key);
  }
}
