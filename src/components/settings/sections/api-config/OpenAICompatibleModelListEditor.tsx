import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Minus, Plus, RefreshCw, XCircle } from 'lucide-react';
import type { ModelOption } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { SMALL_ICON_DANGER_BUTTON_CLASS } from '@/constants/appConstants';

interface OpenAICompatibleModelListEditorProps {
  models: ModelOption[];
  selectedModelId: string;
  onModelsChange: (models: ModelOption[]) => void;
  onSelectedModelChange: (modelId: string) => void;
  onFetchModels?: () => void;
  isFetchModelsDisabled?: boolean;
  isFetchingModels?: boolean;
  fetchModelsStatus?: 'idle' | 'success' | 'error';
  fetchModelsMessage?: string | null;
}

interface EditableModelRow {
  id: string;
  name: string;
  rowId: string;
}

interface EditorState {
  rows: EditableModelRow[];
  sourceModelsKey: string;
}

const createRowId = () => `openai-compatible-model-row-${Math.random().toString(36).slice(2, 10)}`;

const buildModelsKey = (models: Pick<ModelOption, 'id' | 'name'>[]): string =>
  models.map((model) => `${model.id}\u0001${model.name}`).join('\u0000');

const modelNameOrId = (id: string, name: string) => name.trim() || id;

const createModelOption = (id: string, name: string, isPinned = false): ModelOption => ({
  id,
  name: modelNameOrId(id, name),
  ...(isPinned ? { isPinned: true } : {}),
});

const buildModelOptions = (rows: EditableModelRow[]): ModelOption[] =>
  normalizeRows(rows).map((row, index) => createModelOption(row.id, row.name, index === 0));

const collectModels = (models: ModelOption[], selectedModelId: string): ModelOption[] => {
  const collectedModels = models.reduce<ModelOption[]>((result, model) => {
    const modelId = model.id.trim();
    if (!modelId) {
      return result;
    }

    result.push(createModelOption(modelId, model.name, !!model.isPinned));
    return result;
  }, []);

  if (collectedModels.length > 0) {
    return collectedModels;
  }

  const fallbackModelId = selectedModelId.trim();
  return fallbackModelId ? [createModelOption(fallbackModelId, fallbackModelId, true)] : [];
};

const toEditableRows = (models: ModelOption[]): EditableModelRow[] =>
  models.map((model) => ({
    id: model.id,
    name: model.name,
    rowId: createRowId(),
  }));

const normalizeRows = (rows: EditableModelRow[]): EditableModelRow[] => {
  const seenModelIds = new Set<string>();

  return rows.reduce<EditableModelRow[]>((normalizedRows, row) => {
    const modelId = row.id.trim();
    if (!modelId || seenModelIds.has(modelId)) {
      return normalizedRows;
    }

    seenModelIds.add(modelId);
    normalizedRows.push({
      ...row,
      id: modelId,
      name: row.name.trim(),
    });
    return normalizedRows;
  }, []);
};

export const OpenAICompatibleModelListEditor: React.FC<OpenAICompatibleModelListEditorProps> = ({
  models,
  selectedModelId,
  onModelsChange,
  onSelectedModelChange,
  onFetchModels,
  isFetchModelsDisabled = false,
  isFetchingModels = false,
  fetchModelsStatus = 'idle',
  fetchModelsMessage = null,
}) => {
  const { t } = useI18n();
  const externalModels = useMemo(() => collectModels(models, selectedModelId), [models, selectedModelId]);
  const externalModelsKey = buildModelsKey(externalModels);
  const externalRows = useMemo(() => toEditableRows(externalModels), [externalModels]);
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    rows: toEditableRows(externalModels),
    sourceModelsKey: externalModelsKey,
  }));
  const rows = editorState.sourceModelsKey === externalModelsKey ? editorState.rows : externalRows;

  const commitRows = (nextRows: EditableModelRow[]) => {
    const modelOptions = buildModelOptions(nextRows);
    const modelIds = modelOptions.map((model) => model.id);
    setEditorState({
      rows: nextRows,
      sourceModelsKey: externalModelsKey,
    });
    onModelsChange(modelOptions);

    if (modelIds.length > 0 && !modelIds.includes(selectedModelId)) {
      onSelectedModelChange(modelIds[0]);
    }
  };

  const handleAddModel = () => {
    setEditorState({
      rows: [...rows, { id: '', name: '', rowId: createRowId() }],
      sourceModelsKey: externalModelsKey,
    });
  };

  const handleUpdateModel = (rowId: string, id: string) => {
    commitRows(rows.map((row) => (row.rowId === rowId ? { ...row, id } : row)));
  };

  const handleUpdateModelName = (rowId: string, name: string) => {
    commitRows(rows.map((row) => (row.rowId === rowId ? { ...row, name } : row)));
  };

  const handleTrimModel = (rowId: string) => {
    commitRows(rows.map((row) => (row.rowId === rowId ? { ...row, id: row.id.trim() } : row)));
  };

  const handleTrimModelName = (rowId: string) => {
    commitRows(rows.map((row) => (row.rowId === rowId ? { ...row, name: row.name.trim() } : row)));
  };

  const handleRemoveModel = (rowId: string) => {
    commitRows(rows.filter((row) => row.rowId !== rowId));
  };

  const showFetchModelsResult = fetchModelsStatus !== 'idle' && !!fetchModelsMessage;
  const fetchModelsResultClass =
    fetchModelsStatus === 'success'
      ? 'border-green-500/20 bg-green-500/10 text-green-600'
      : 'border-red-500/20 bg-red-500/10 text-red-600';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
          {t('settingsOpenAICompatibleModelId')}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {onFetchModels && (
            <button
              type="button"
              onClick={onFetchModels}
              disabled={isFetchModelsDisabled || isFetchingModels}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              title={t('settingsFetchModelList')}
            >
              {isFetchingModels ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isFetchingModels ? t('settingsFetchingModelList') : t('settingsFetchModelList')}
            </button>
          )}
          <button
            type="button"
            onClick={handleAddModel}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--theme-text-primary)] transition-colors hover:bg-[var(--theme-bg-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-secondary)]"
            title={t('settingsAddModel')}
          >
            <Plus size={14} />
            {t('settingsAddModel')}
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--theme-bg-input)]/45 p-1.5">
        {rows.length > 0 ? (
          <div className="space-y-1">
            {rows.map((row, index) => (
              <div
                key={row.rowId}
                className="grid grid-cols-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--theme-bg-tertiary)]/35 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto]"
              >
                <div className="min-w-0 space-y-1">
                  <label
                    htmlFor={`${row.rowId}-id`}
                    className="block text-[10px] font-medium uppercase tracking-wider text-[var(--theme-text-tertiary)]"
                  >
                    {t('settingsOpenAICompatibleModelIdShort')}
                  </label>
                  <input
                    id={`${row.rowId}-id`}
                    type="text"
                    value={row.id}
                    onChange={(event) => handleUpdateModel(row.rowId, event.target.value)}
                    onBlur={() => handleTrimModel(row.rowId)}
                    data-openai-compatible-model-id-input="true"
                    className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-mono text-[var(--theme-text-primary)] transition-colors placeholder:text-[var(--theme-text-tertiary)] focus:border-[var(--theme-border-focus)] focus:bg-[var(--theme-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]/15"
                    placeholder="gpt-5.5"
                    aria-label={`${t('settingsOpenAICompatibleModelIdShort')} ${index + 1}`}
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <label
                    htmlFor={`${row.rowId}-name`}
                    className="block text-[10px] font-medium uppercase tracking-wider text-[var(--theme-text-tertiary)]"
                  >
                    {t('settingsOpenAICompatibleModelName')}
                  </label>
                  <input
                    id={`${row.rowId}-name`}
                    type="text"
                    value={row.name}
                    onChange={(event) => handleUpdateModelName(row.rowId, event.target.value)}
                    onBlur={() => handleTrimModelName(row.rowId)}
                    data-openai-compatible-model-name-input="true"
                    className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-[var(--theme-text-primary)] transition-colors placeholder:text-[var(--theme-text-tertiary)] focus:border-[var(--theme-border-focus)] focus:bg-[var(--theme-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]/15"
                    placeholder={t('settingsModelNamePlaceholder')}
                    aria-label={`${t('settingsOpenAICompatibleModelName')} ${index + 1}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveModel(row.rowId)}
                  className={`justify-self-end sm:self-end ${SMALL_ICON_DANGER_BUTTON_CLASS}`}
                  title={t('settingsRemoveModel')}
                  aria-label={t('settingsRemoveModel')}
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-xs italic text-[var(--theme-text-tertiary)]">
            {t('settingsNoModelsInList')}
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-[var(--theme-text-tertiary)]">
        {t('settingsOpenAICompatibleModelIdHelp')}
      </p>

      {showFetchModelsResult && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-2 text-xs animate-in fade-in slide-in-from-top-1 ${fetchModelsResultClass}`}
        >
          {fetchModelsStatus === 'success' ? (
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle size={14} className="mt-0.5 flex-shrink-0" />
          )}
          <span className="break-all">{fetchModelsMessage}</span>
        </div>
      )}
    </div>
  );
};
