import React, { useState } from 'react';
import { ModelOption } from '../../../types';
import { ModelSelectorHeader } from './model-selector/ModelSelectorHeader';
import { ModelListEditor } from './model-selector/ModelListEditor';
import { ModelListView } from './model-selector/ModelListView';

interface ModelSelectorProps {
  availableModels: ModelOption[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  defaultModels?: ModelOption[];
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  selectedModelId,
  onSelectModel,
  setAvailableModels,
  defaultModels,
}) => {
  const [isEditingList, setIsEditingList] = useState(false);

  return (
    <div className="space-y-4">
      <ModelSelectorHeader isEditingList={isEditingList} setIsEditingList={setIsEditingList} />

      {isEditingList ? (
        <ModelListEditor
          availableModels={availableModels}
          defaultModels={defaultModels}
          onSave={setAvailableModels}
          setIsEditingList={setIsEditingList}
        />
      ) : (
        <ModelListView
          availableModels={availableModels}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
        />
      )}
    </div>
  );
};
