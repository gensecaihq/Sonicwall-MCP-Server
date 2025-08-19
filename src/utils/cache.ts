interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;

  constructor(defaultTtlSeconds: number = 300) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    
    // Clean expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    const expiry = Date.now() + ttlMs;
    
    this.cache.set(key, {
      data: value,
      expiry
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: process.memoryUsage(),
    };
  }
}