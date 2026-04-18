import { ModelOption } from '../types';
import { getModelOptionsForGroup } from '../constants/modelRegistry';
import { sortModels } from './modelHelpers';

export const getDefaultModelOptions = (): ModelOption[] => {
  return sortModels([
    ...getModelOptionsForGroup('defaultPinned', { pinned: true }),
    ...getModelOptionsForGroup('tts', { pinned: true }),
    ...getModelOptionsForGroup('image', { pinned: true }),
  ]);
};
