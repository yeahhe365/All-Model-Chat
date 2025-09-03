import { logService } from '../services/logService';

export interface StreamThrottleOptions {
    maxConcurrentStreams: number;
    streamTimeout: number;
    retryAttempts: number;
    retryDelay: number;
}

interface QueuedStream {
    id: string;
    sessionId: string;
    execute: () => Promise<void>;
    abort: () => void;
    resolve: (value: void | PromiseLike<void>) => void;
    reject: (reason?: any) => void;
}

export class StreamThrottler {
    private activeStreams = new Map<string, { controller: AbortController; sessionId: string }>();
    private sessionStates = new Map<string, 'idle' | 'processing'>();
    private queue: QueuedStream[] = [];
    private options: StreamThrottleOptions;
    private processingLock = false;

    constructor(options: StreamThrottleOptions) {
        this.options = options;
    }

    async executeStream(id: string, sessionId: string, executeFn: () => Promise<void>): Promise<void> {
        // Check if session is already processing - prevent race conditions
        if (this.sessionStates.get(sessionId) === 'processing') {
            throw new Error(`Session ${sessionId} is already processing a stream`);
        }

        return new Promise<void>((resolve, reject) => {
            const queueItem: QueuedStream = {
                id,
                sessionId,
                execute: executeFn,
                abort: () => {},
                resolve,
                reject
            };

            // If we're under the concurrent limit and session is free, execute immediately
            if (this.activeStreams.size < this.options.maxConcurrentStreams && 
                this.sessionStates.get(sessionId) !== 'processing') {
                this.executeStreamImmediately(queueItem);
            } else {
                // Add to queue
                this.queue.push(queueItem);
                this.processQueue();
            }
        });
    }

    private async executeStreamImmediately(item: QueuedStream): Promise<void> {
        const abortController = new AbortController();
        
        // Mark session as processing
        this.sessionStates.set(item.sessionId, 'processing');
        this.activeStreams.set(item.id, { controller: abortController, sessionId: item.sessionId });

        try {
            // Set timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Stream timeout for ${item.id}`));
                }, this.options.streamTimeout);
            });

            // Execute with retry logic
            await this.executeWithRetry(item.execute, timeoutPromise);
            item.resolve();
        } catch (error) {
            logService.error(`Stream execution failed for ${item.id}:`, error);
            item.reject(error);
        } finally {
            this.activeStreams.delete(item.id);
            this.sessionStates.set(item.sessionId, 'idle');
            this.processQueue();
        }
    }

    private async executeWithRetry(
        executeFn: () => Promise<void>,
        timeoutPromise: Promise<never>,
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
        if (this.processingLock) return;
        this.processingLock = true;

        // Process queue safely
        try {
            while (this.queue.length > 0 && this.activeStreams.size < this.options.maxConcurrentStreams) {
                // Find next item with free session
                const availableIndex = this.queue.findIndex(item => 
                    this.sessionStates.get(item.sessionId) !== 'processing'
                );
                
                if (availableIndex === -1) break; // No available sessions
                
                const item = this.queue.splice(availableIndex, 1)[0];
                this.executeStreamImmediately(item);
            }
        } finally {
            this.processingLock = false;
        }
    }

    abortStream(id: string): boolean {
        const streamInfo = this.activeStreams.get(id);
        if (streamInfo) {
            streamInfo.controller.abort();
            this.activeStreams.delete(id);
            this.sessionStates.set(streamInfo.sessionId, 'idle');
            this.processQueue();
            return true;
        }
        
        // Also remove from queue if present
        const queueIndex = this.queue.findIndex(item => item.id === id);
        if (queueIndex !== -1) {
            const item = this.queue.splice(queueIndex, 1)[0];
            item.reject(new Error('Stream aborted'));
            return true;
        }
        
        return false;
    }

    abortSession(sessionId: string): void {
        // Abort active streams for this session
        for (const [streamId, streamInfo] of this.activeStreams.entries()) {
            if (streamInfo.sessionId === sessionId) {
                streamInfo.controller.abort();
                this.activeStreams.delete(streamId);
            }
        }
        
        // Remove queued items for this session
        const itemsToReject = this.queue.filter(item => item.sessionId === sessionId);
        this.queue = this.queue.filter(item => item.sessionId !== sessionId);
        
        itemsToReject.forEach(item => item.reject(new Error('Session aborted')));
        this.sessionStates.set(sessionId, 'idle');
        this.processQueue();
    }

    abortAll(): void {
        // Abort all active streams
        this.activeStreams.forEach(streamInfo => streamInfo.controller.abort());
        this.activeStreams.clear();
        
        // Reject all queued items
        this.queue.forEach(item => item.reject(new Error('All streams aborted')));
        this.queue = [];
        
        // Reset all session states
        this.sessionStates.clear();
    }

    getActiveStreams(): string[] {
        return Array.from(this.activeStreams.keys());
    }

    getQueueLength(): number {
        return this.queue.length;
    }

    getSessionState(sessionId: string): 'idle' | 'processing' | undefined {
        return this.sessionStates.get(sessionId);
    }
}

// Enhanced throttler for conversation streams - allows multiple concurrent sessions
export const conversationStreamThrottler = new StreamThrottler({
    maxConcurrentStreams: 5, // Allow multiple conversations
    streamTimeout: 300000, // 5 minutes
    retryAttempts: 2,
    retryDelay: 1000,
});