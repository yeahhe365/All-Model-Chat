import React from 'react';
import { UploadedFile, ChatInputToolbarProps } from '../../../types';
import { translations } from '../../../utils/appUtils';
import { ImagenAspectRatioSelector } from './ImagenAspectRatioSelector';
import { SelectedFileDisplay } from '../SelectedFileDisplay';
import { AddFileByIdInput } from './AddFileByIdInput';

export const ChatInputToolbar: React.FC<ChatInputToolbarProps> = ({
  isImagenModel,
  aspectRatio,
  setAspectRatio,
  fileError,
  selectedFiles,
  onRemoveFile,
  onCancelUpload,
  showAddByIdInput,
  fileIdInput,
  setFileIdInput,
  onAddFileByIdSubmit,
  onCancelAddById,
  isAddingById,
  isLoading,
  t,
}) => {
  return (
    <div>
      {isImagenModel && setAspectRatio && aspectRatio && (
        <ImagenAspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} t={t as (key: string) => string} />
      )}
      {fileError && <div className="mb-2 p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-danger)] bg-opacity-20 border border-[var(--theme-bg-danger)] rounded-md">{fileError}</div>}
      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 bg-[var(--theme-bg-secondary)] rounded-lg border border-[var(--theme-border-secondary)] overflow-x-auto custom-scrollbar">
          <div className="flex gap-3">
            {selectedFiles.map(file => (
              <SelectedFileDisplay key={file.id} file={file} onRemove={onRemoveFile} onCancelUpload={onCancelUpload} />
            ))}
          </div>
        </div>
      )}
      {showAddByIdInput && (
        <AddFileByIdInput
          fileIdInput={fileIdInput}
          setFileIdInput={setFileIdInput}
          onAddFileByIdSubmit={onAddFileByIdSubmit}
          onCancel={onCancelAddById}
          isAddingById={isAddingById}
          isLoading={isLoading}
          t={t as (key: string) => string}
        />
      )}
    </div>
  );
};
