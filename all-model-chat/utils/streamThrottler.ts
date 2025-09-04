import { logService } from '../services/logService';

export interface StreamThrottleOptions {
    maxConcurrentStreams: number;
    streamTimeout: number;
    retryAttempts: number;
    retryDelay: number;
}

export class StreamThrottler {
    private activeStreams = new Map<string, AbortController>();
    private queue: Array<{ id: string; execute: () => Promise<void>; abort: () => void }> = [];
    private options: StreamThrottleOptions;

    constructor(options: StreamThrottleOptions) {
        this.options = options;
    }

    async executeStream(id: string, executeFn: () => Promise<void>): Promise<void> {
        const abortController = new AbortController();
        
        // Add to active streams
        this.activeStreams.set(id, abortController);

        try {
            // Set timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Stream timeout for ${id}`));
                }, this.options.streamTimeout);
            });

            // Execute with retry logic
            await this.executeWithRetry(executeFn, timeoutPromise);
        } catch (error) {
            logService.error(`Stream execution failed for ${id}:`, error);
            throw error;
        } finally {
            this.activeStreams.delete(id);
            this.processQueue();
        }
    }

    private async executeWithRetry(
        executeFn: () => Promise<void>,
        timeoutPromise: Promise<void>,
        attempt = 1
    ): Promise<void> {
        try {
            await Promise.race([executeFn(), timeoutPromise]);
        } catch (error) {
            if (attempt < this.options.retryAttempts) {
                logService.warn(`Stream attempt ${attempt} failed, retrying...`, error);
                await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
                return this.executeWithRetry(executeFn, timeoutPromise, attempt + 1);
            }
            throw error;
        }
    }

    private processQueue(): void {
        while (this.queue.length > 0 && this.activeStreams.size < this.options.maxConcurrentStreams) {
            const item = this.queue.shift();
            if (item) {
                this.executeStream(item.id, item.execute).catch(() => {
                    // Error already logged in executeStream
                });
            }
        }
    }

    abortStream(id: string): boolean {
        const controller = this.activeStreams.get(id);
        if (controller) {
            controller.abort();
            this.activeStreams.delete(id);
            return true;
        }
        return false;
    }

    abortAll(): void {
        this.activeStreams.forEach(controller => controller.abort());
        this.activeStreams.clear();
        this.queue = [];
    }

    getActiveStreams(): string[] {
        return Array.from(this.activeStreams.keys());
    }

    getQueueLength(): number {
        return this.queue.length;
    }
}

// Default throttler for conversation streams
export const conversationStreamThrottler = new StreamThrottler({
    maxConcurrentStreams: 1, // Only one stream at a time
    streamTimeout: 300000, // 5 minutes
    retryAttempts: 2,
    retryDelay: 1000,
});