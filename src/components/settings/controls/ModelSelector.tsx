import React, { useState } from 'react';
import { ApiMode, ModelOption } from '../../../types';
import { ModelSelectorHeader } from './model-selector/ModelSelectorHeader';
import { ModelListEditor } from './model-selector/ModelListEditor';
import { ModelListView } from './model-selector/ModelListView';

interface ModelSelectorProps {
  availableModels: ModelOption[];
  selectedModelId: string;
  selectedApiMode?: ApiMode;
  onSelectModel: (id: string, apiMode?: ApiMode) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  defaultModels?: ModelOption[];
  defaultApiMode?: ApiMode;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  selectedModelId,
  selectedApiMode,
  onSelectModel,
  setAvailableModels,
  defaultModels,
  defaultApiMode,
}) => {
  const [isEditingList, setIsEditingList] = useState(false);
  const isProviderAwareList =
    availableModels.some((model) => model.apiMode === 'openai-compatible') ||
    !!defaultModels?.some((model) => model.apiMode === 'openai-compatible');

  return (
    <div className="space-y-4">
      <ModelSelectorHeader isEditingList={isEditingList} setIsEditingList={setIsEditingList} />

      {isEditingList ? (
        <ModelListEditor
          availableModels={availableModels}
          defaultModels={defaultModels}
          defaultApiMode={defaultApiMode}
          showApiModeControls={isProviderAwareList}
          onSave={setAvailableModels}
          setIsEditingList={setIsEditingList}
        />
      ) : (
        <ModelListView
          availableModels={availableModels}
          selectedModelId={selectedModelId}
          selectedApiMode={selectedApiMode}
          onSelectModel={onSelectModel}
        />
      )}
    </div>
  );
};
