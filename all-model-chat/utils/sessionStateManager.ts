import { SavedChatSession } from '../types';
import { logService } from '../services/logService';

interface SessionUpdateOperation {
    sessionId: string;
    timestamp: number;
    type: 'stream_update' | 'completion' | 'error';
    operationId: string;
}

type SessionUpdater = (session: SavedChatSession) => SavedChatSession;
type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[]) => void;

export class SessionStateManager {
    private activeOperations = new Map<string, SessionUpdateOperation>();
    private updateQueue = new Map<string, Array<{ updater: SessionUpdater; resolve: () => void; reject: (error: Error) => void }>>();
    private processingSession = new Set<string>();

    async atomicSessionUpdate(
        sessionId: string,
        updateFunction: SessionUpdater,
        updateAndPersistSessions: SessionsUpdater,
        operationId: string,
        operationType: 'stream_update' | 'completion' | 'error' = 'stream_update'
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const operation: SessionUpdateOperation = {
                sessionId,
                timestamp: Date.now(),
                type: operationType,
                operationId
            };

            // Add to queue for this session
            if (!this.updateQueue.has(sessionId)) {
                this.updateQueue.set(sessionId, []);
            }

            this.updateQueue.get(sessionId)!.push({
                updater: updateFunction,
                resolve,
                reject
            });

            this.activeOperations.set(operationId, operation);

            // Process queue for this session
            this.processSessionQueue(sessionId, updateAndPersistSessions);
        });
    }

    private async processSessionQueue(
        sessionId: string,
        updateAndPersistSessions: SessionsUpdater
    ): Promise<void> {
        if (this.processingSession.has(sessionId)) {
            return; // Already processing this session
        }

        this.processingSession.add(sessionId);

        try {
            const queue = this.updateQueue.get(sessionId);
            if (!queue || queue.length === 0) {
                return;
            }

            // Process all pending updates for this session in batch
            const updates = [...queue];
            this.updateQueue.set(sessionId, []);

            // Apply all updates atomically
            updateAndPersistSessions(prev => {
                return prev.map(session => {
                    if (session.id !== sessionId) {
                        return session;
                    }

                    let updatedSession = session;
                    for (const update of updates) {
                        try {
                            updatedSession = update.updater(updatedSession);
                            update.resolve();
                        } catch (error) {
                            logService.error(`Session update failed for ${sessionId}:`, error);
                            update.reject(error as Error);
                        }
                    }
                    return updatedSession;
                });
            });

        } catch (error) {
            logService.error(`Session queue processing failed for ${sessionId}:`, error);
            
            // Reject all pending updates
            const queue = this.updateQueue.get(sessionId) || [];
            queue.forEach(update => update.reject(error as Error));
            this.updateQueue.set(sessionId, []);
        } finally {
            this.processingSession.delete(sessionId);

            // Check if more updates were added while processing
            const remainingQueue = this.updateQueue.get(sessionId);
            if (remainingQueue && remainingQueue.length > 0) {
                // Schedule next batch
                setTimeout(() => this.processSessionQueue(sessionId, updateAndPersistSessions), 0);
            }
        }
    }

    completeOperation(operationId: string): void {
        const operation = this.activeOperations.get(operationId);
        if (operation) {
            this.activeOperations.delete(operationId);
            
            // Clean up old operations
            this.cleanupOldOperations();
        }
    }

    abortSessionOperations(sessionId: string): void {
        // Remove all operations for this session
        const operationsToRemove = [];
        for (const [opId, operation] of this.activeOperations.entries()) {
            if (operation.sessionId === sessionId) {
                operationsToRemove.push(opId);
            }
        }

        operationsToRemove.forEach(opId => {
            this.activeOperations.delete(opId);
        });

        // Clear update queue for this session
        const queue = this.updateQueue.get(sessionId) || [];
        queue.forEach(update => update.reject(new Error('Session operations aborted')));
        this.updateQueue.set(sessionId, []);
        
        this.processingSession.delete(sessionId);
    }

    private cleanupOldOperations(): void {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        
        for (const [opId, operation] of this.activeOperations.entries()) {
            if (operation.timestamp < fiveMinutesAgo) {
                this.activeOperations.delete(opId);
                logService.warn(`Cleaned up stale session operation: ${opId}`);
            }
        }
    }

    getActiveOperations(): SessionUpdateOperation[] {
        return Array.from(this.activeOperations.values());
    }

    isSessionProcessing(sessionId: string): boolean {
        return this.processingSession.has(sessionId);
    }

    getQueueLength(sessionId: string): number {
        return this.updateQueue.get(sessionId)?.length || 0;
    }
}

export const sessionStateManager = new SessionStateManager();