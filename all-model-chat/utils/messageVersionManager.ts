import { ChatMessage, ModelResponseVersion } from '../types';
import { logService } from '../services/logService';

interface PendingVersionOperation {
    messageId: string;
    sessionId: string;
    timestamp: number;
    type: 'retry' | 'edit';
}

export class MessageVersionManager {
    private pendingOperations = new Map<string, PendingVersionOperation>();
    private versionLocks = new Map<string, Promise<void>>();

    async createRetryVersion(
        messageId: string,
        sessionId: string,
        generationStartTime: Date
    ): Promise<{ canProceed: boolean; conflict?: string }> {
        const operationKey = `${sessionId}-${messageId}`;
        
        // Check for existing operation
        if (this.pendingOperations.has(operationKey)) {
            const existing = this.pendingOperations.get(operationKey)!;
            return {
                canProceed: false,
                conflict: `${existing.type} operation already in progress for message ${messageId}`
            };
        }

        // Create operation lock
        const operation: PendingVersionOperation = {
            messageId,
            sessionId,
            timestamp: Date.now(),
            type: 'retry'
        };

        this.pendingOperations.set(operationKey, operation);

        return { canProceed: true };
    }

    async safeCreateMessageVersion(
        message: ChatMessage,
        generationStartTime: Date
    ): Promise<ChatMessage> {
        const operationKey = `${message.id}`;
        
        // Wait for any existing version lock
        const existingLock = this.versionLocks.get(operationKey);
        if (existingLock) {
            try {
                await existingLock;
            } catch (error) {
                logService.warn('Version lock wait failed:', error);
            }
        }

        // Create new version lock
        const versionPromise = this.createVersionSafely(message, generationStartTime);
        this.versionLocks.set(operationKey, versionPromise.then(() => {}));

        try {
            const result = await versionPromise;
            return result;
        } finally {
            this.versionLocks.delete(operationKey);
        }
    }

    private async createVersionSafely(
        message: ChatMessage,
        generationStartTime: Date
    ): Promise<ChatMessage> {
        // Create new version for retry
        const newVersion: ModelResponseVersion = {
            content: '',
            timestamp: new Date(),
            generationStartTime,
        };

        // Get existing versions or create new array
        const versions = [...(message.versions || [])];

        // Save current state as original version if no versions exist
        if (versions.length === 0) {
            const originalVersion: ModelResponseVersion = {
                content: message.content,
                files: message.files,
                timestamp: message.timestamp,
                thoughts: message.thoughts,
                generationStartTime: message.generationStartTime,
                generationEndTime: message.generationEndTime,
                thinkingTimeMs: message.thinkingTimeMs,
                promptTokens: message.promptTokens,
                completionTokens: message.completionTokens,
                totalTokens: message.totalTokens,
                cumulativeTotalTokens: message.cumulativeTotalTokens,
                audioSrc: message.audioSrc,
                groundingMetadata: message.groundingMetadata,
                suggestions: message.suggestions,
                isGeneratingSuggestions: message.isGeneratingSuggestions
            };
            versions.push(originalVersion);
        }

        // Add new version for retry
        versions.push(newVersion);
        const newActiveIndex = versions.length - 1;

        return {
            ...message,
            versions,
            activeVersionIndex: newActiveIndex,
            isLoading: true,
            content: '',
            files: [],
            thoughts: '',
            generationStartTime,
            generationEndTime: undefined,
            thinkingTimeMs: undefined
        };
    }

    completeVersionOperation(messageId: string, sessionId: string): void {
        const operationKey = `${sessionId}-${messageId}`;
        this.pendingOperations.delete(operationKey);
        
        // Clean up old operations (older than 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        for (const [key, operation] of this.pendingOperations.entries()) {
            if (operation.timestamp < fiveMinutesAgo) {
                this.pendingOperations.delete(key);
                logService.warn(`Cleaned up stale version operation: ${key}`);
            }
        }
    }

    abortVersionOperation(messageId: string, sessionId: string): void {
        const operationKey = `${sessionId}-${messageId}`;
        this.pendingOperations.delete(operationKey);
    }

    isMessageLocked(messageId: string): boolean {
        return this.versionLocks.has(messageId);
    }

    getActiveOperations(): Array<{ messageId: string; sessionId: string; type: string }> {
        return Array.from(this.pendingOperations.values()).map(op => ({
            messageId: op.messageId,
            sessionId: op.sessionId,
            type: op.type
        }));
    }
}

export const messageVersionManager = new MessageVersionManager();