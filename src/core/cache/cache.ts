export class SimpleCache<T> {
    private cache = new Map<string, { data: T; expiry: number }>();
    private ttl: number;

    constructor(ttlSeconds: number) {
        this.ttl = ttlSeconds * 1000;
    }

    get(key: string): T | undefined {
        const item = this.cache.get(key);
        if (!item) {
            return undefined;
        }

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return undefined;
        }

        return item.data;
    }

    set(key: string, data: T): void {
        const expiry = Date.now() + this.ttl;
        this.cache.set(key, { data, expiry });
    }

    clear(): void {
        this.cache.clear();
    }

    delete(key: string): void {
        this.cache.delete(key);
    }
}