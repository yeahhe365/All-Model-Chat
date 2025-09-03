import { Dispatch, SetStateAction } from 'react';
import { logService } from '../services/logService';

interface JobInfo {
    generationId: string;
    sessionId: string;
    controller: AbortController;
    startTime: Date;
    status: 'active' | 'completing' | 'completed' | 'aborted' | 'error';
}

export class ActiveJobsManager {
    private jobs = new Map<string, JobInfo>();
    private sessionJobs = new Map<string, Set<string>>(); // sessionId -> Set of generationIds
    private cleanupCallbacks = new Map<string, Array<() => void>>();

    startJob(
        generationId: string,
        sessionId: string,
        controller: AbortController,
        setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>
    ): void {
        const jobInfo: JobInfo = {
            generationId,
            sessionId,
            controller,
            startTime: new Date(),
            status: 'active'
        };

        this.jobs.set(generationId, jobInfo);

        // Track session jobs
        if (!this.sessionJobs.has(sessionId)) {
            this.sessionJobs.set(sessionId, new Set());
        }
        this.sessionJobs.get(sessionId)!.add(generationId);

        // Add to loading sessions
        setLoadingSessionIds(prev => new Set(prev).add(sessionId));

        logService.info(`Job started: ${generationId} for session ${sessionId}`);
    }

    markJobCompleting(generationId: string): boolean {
        const job = this.jobs.get(generationId);
        if (!job || job.status !== 'active') {
            return false;
        }

        job.status = 'completing';
        return true;
    }

    completeJob(
        generationId: string,
        setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>,
        status: 'completed' | 'aborted' | 'error' = 'completed'
    ): boolean {
        const job = this.jobs.get(generationId);
        if (!job) {
            logService.warn(`Attempted to complete unknown job: ${generationId}`);
            return false;
        }

        // Update status
        job.status = status;

        // Remove from session jobs tracking
        const sessionJobs = this.sessionJobs.get(job.sessionId);
        if (sessionJobs) {
            sessionJobs.delete(generationId);
            
            // If no more active jobs for this session, remove from loading
            const hasActiveJobs = Array.from(sessionJobs).some(jobId => {
                const jobInfo = this.jobs.get(jobId);
                return jobInfo && ['active', 'completing'].includes(jobInfo.status);
            });

            if (!hasActiveJobs) {
                setLoadingSessionIds(prev => {
                    const next = new Set(prev);
                    next.delete(job.sessionId);
                    return next;
                });
                
                // Clean up empty session tracking
                if (sessionJobs.size === 0) {
                    this.sessionJobs.delete(job.sessionId);
                }
            }
        }

        // Execute cleanup callbacks
        const callbacks = this.cleanupCallbacks.get(generationId) || [];
        callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                logService.error(`Job cleanup callback failed for ${generationId}:`, error);
            }
        });
        this.cleanupCallbacks.delete(generationId);

        // Remove the job
        this.jobs.delete(generationId);

        logService.info(`Job completed: ${generationId} with status ${status}`);
        return true;
    }

    abortJob(generationId: string, setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>): boolean {
        const job = this.jobs.get(generationId);
        if (!job) {
            return false;
        }

        // Abort the controller if still active
        if (['active', 'completing'].includes(job.status)) {
            try {
                job.controller.abort();
            } catch (error) {
                logService.warn(`Error aborting job controller ${generationId}:`, error);
            }
        }

        return this.completeJob(generationId, setLoadingSessionIds, 'aborted');
    }

    abortSessionJobs(sessionId: string, setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>): number {
        const sessionJobs = this.sessionJobs.get(sessionId);
        if (!sessionJobs) {
            return 0;
        }

        let abortedCount = 0;
        const jobIds = Array.from(sessionJobs);
        
        for (const jobId of jobIds) {
            if (this.abortJob(jobId, setLoadingSessionIds)) {
                abortedCount++;
            }
        }

        return abortedCount;
    }

    abortAllJobs(setLoadingSessionIds: Dispatch<SetStateAction<Set<string>>>): number {
        const allJobIds = Array.from(this.jobs.keys());
        let abortedCount = 0;

        for (const jobId of allJobIds) {
            if (this.abortJob(jobId, setLoadingSessionIds)) {
                abortedCount++;
            }
        }

        return abortedCount;
    }

    addCleanupCallback(generationId: string, callback: () => void): void {
        if (!this.cleanupCallbacks.has(generationId)) {
            this.cleanupCallbacks.set(generationId, []);
        }
        this.cleanupCallbacks.get(generationId)!.push(callback);
    }

    getJob(generationId: string): JobInfo | undefined {
        return this.jobs.get(generationId);
    }

    getSessionJobs(sessionId: string): JobInfo[] {
        const sessionJobs = this.sessionJobs.get(sessionId);
        if (!sessionJobs) {
            return [];
        }

        return Array.from(sessionJobs)
            .map(jobId => this.jobs.get(jobId))
            .filter(job => job !== undefined) as JobInfo[];
    }

    getAllJobs(): JobInfo[] {
        return Array.from(this.jobs.values());
    }

    getActiveJobsCount(): number {
        return Array.from(this.jobs.values()).filter(job => 
            ['active', 'completing'].includes(job.status)
        ).length;
    }

    hasActiveJobsForSession(sessionId: string): boolean {
        const sessionJobs = this.sessionJobs.get(sessionId);
        if (!sessionJobs) {
            return false;
        }

        return Array.from(sessionJobs).some(jobId => {
            const job = this.jobs.get(jobId);
            return job && ['active', 'completing'].includes(job.status);
        });
    }

    // Compatibility with existing activeJobs Map interface
    toMap(): Map<string, AbortController> {
        const map = new Map<string, AbortController>();
        for (const [generationId, job] of this.jobs.entries()) {
            if (['active', 'completing'].includes(job.status)) {
                map.set(generationId, job.controller);
            }
        }
        return map;
    }

    // Clean up old completed jobs (for memory management)
    cleanup(): void {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        for (const [generationId, job] of this.jobs.entries()) {
            if (['completed', 'aborted', 'error'].includes(job.status) && job.startTime < oneHourAgo) {
                this.jobs.delete(generationId);
                this.cleanupCallbacks.delete(generationId);
                
                // Clean up session tracking
                const sessionJobs = this.sessionJobs.get(job.sessionId);
                if (sessionJobs) {
                    sessionJobs.delete(generationId);
                    if (sessionJobs.size === 0) {
                        this.sessionJobs.delete(job.sessionId);
                    }
                }
            }
        }
    }
}

export const activeJobsManager = new ActiveJobsManager();