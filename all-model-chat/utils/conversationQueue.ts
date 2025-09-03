export interface ConversationQueueItem {
    id: string;
    sessionId: string;
    priority: number;
    timestamp: number;
    execute: () => Promise<void>;
    abort: () => void;
}

export class ConversationQueue {
    private queue: ConversationQueueItem[] = [];
    private isProcessing = false;
    private currentItem: ConversationQueueItem | null = null;

    enqueue(item: ConversationQueueItem): void {
        this.queue.push(item);
        this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
        this.processQueue();
    }

    dequeue(sessionId: string): boolean {
        const index = this.queue.findIndex(item => item.sessionId === sessionId);
        if (index !== -1) {
            const item = this.queue.splice(index, 1)[0];
            item.abort();
            return true;
        }
        return false;
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            this.currentItem = this.queue.shift()!;
            
            try {
                await this.currentItem.execute();
            } catch (error) {
                console.error('Conversation queue item failed:', error);
            }
        }

        this.currentItem = null;
        this.isProcessing = false;
    }

    getQueueStatus(): {
        isProcessing: boolean;
        queueLength: number;
        currentItem: ConversationQueueItem | null;
    } {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.queue.length,
            currentItem: this.currentItem,
        };
    }

    clear(): void {
        this.queue.forEach(item => item.abort());
        this.queue = [];
        if (this.currentItem) {
            this.currentItem.abort();
            this.currentItem = null;
        }
        this.isProcessing = false;
    }
}

export const conversationQueue = new ConversationQueue();