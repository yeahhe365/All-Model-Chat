import type { MutableRefObject } from 'react';

type ActiveJobsRef = MutableRefObject<Map<string, AbortController>>;

const jobSessionsByRef = new WeakMap<ActiveJobsRef, Map<string, string>>();
const handoffSessionsByRef = new WeakMap<ActiveJobsRef, Set<string>>();

const getJobSessions = (activeJobs: ActiveJobsRef) => {
  let jobSessions = jobSessionsByRef.get(activeJobs);
  if (!jobSessions) {
    jobSessions = new Map<string, string>();
    jobSessionsByRef.set(activeJobs, jobSessions);
  }
  return jobSessions;
};

const getHandoffSessions = (activeJobs: ActiveJobsRef) => {
  let handoffSessions = handoffSessionsByRef.get(activeJobs);
  if (!handoffSessions) {
    handoffSessions = new Set<string>();
    handoffSessionsByRef.set(activeJobs, handoffSessions);
  }
  return handoffSessions;
};

export const startActiveGenerationJob = (
  activeJobs: ActiveJobsRef,
  sessionId: string,
  generationId: string,
  abortController: AbortController,
) => {
  activeJobs.current.set(generationId, abortController);
  getJobSessions(activeJobs).set(generationId, sessionId);
  getHandoffSessions(activeJobs).delete(sessionId);
};

export const unregisterActiveGenerationJob = (activeJobs: ActiveJobsRef, generationId: string) => {
  activeJobs.current.delete(generationId);
  getJobSessions(activeJobs).delete(generationId);
};

export const hasActiveGenerationJobForSession = (activeJobs: ActiveJobsRef, sessionId: string) => {
  const jobSessions = getJobSessions(activeJobs);
  let hasActiveJob = false;

  for (const [jobId, jobSessionId] of jobSessions) {
    if (!activeJobs.current.has(jobId)) {
      jobSessions.delete(jobId);
      continue;
    }

    if (jobSessionId === sessionId) {
      hasActiveJob = true;
    }
  }

  return hasActiveJob;
};

export const holdSessionLoadingForGenerationHandoff = (activeJobs: ActiveJobsRef, sessionId: string) => {
  getHandoffSessions(activeJobs).add(sessionId);
};

export const releaseSessionLoadingForGenerationHandoff = ({
  activeJobs,
  setSessionLoading,
  sessionId,
}: {
  activeJobs: ActiveJobsRef;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  sessionId: string;
}) => {
  const handoffSessions = getHandoffSessions(activeJobs);
  const hadHandoff = handoffSessions.delete(sessionId);

  if (hadHandoff && !hasActiveGenerationJobForSession(activeJobs, sessionId)) {
    setSessionLoading(sessionId, false);
  }
};

export const finishActiveGenerationJob = ({
  activeJobs,
  setSessionLoading,
  sessionId,
  generationId,
}: {
  activeJobs: ActiveJobsRef;
  setSessionLoading: (sessionId: string, isLoading: boolean) => void;
  sessionId: string;
  generationId: string;
}) => {
  unregisterActiveGenerationJob(activeJobs, generationId);

  if (!getHandoffSessions(activeJobs).has(sessionId) && !hasActiveGenerationJobForSession(activeJobs, sessionId)) {
    setSessionLoading(sessionId, false);
  }
};
