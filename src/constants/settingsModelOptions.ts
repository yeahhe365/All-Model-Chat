import { ModelOption } from '../types';
import { getModelOptionsForGroup } from './modelRegistry';

export const AVAILABLE_LIVE_ARTIFACTS_MODELS: ModelOption[] = getModelOptionsForGroup('liveArtifacts');

export const CONNECTION_TEST_MODELS: ModelOption[] = getModelOptionsForGroup('connectionTest');

export const AVAILABLE_TRANSCRIPTION_MODELS: { id: string; name: string }[] = getModelOptionsForGroup('transcription');
