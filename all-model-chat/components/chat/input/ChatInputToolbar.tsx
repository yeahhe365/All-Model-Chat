
import React from 'react';
import { ImagenAspectRatioSelector, AddFileByIdInput, AddUrlInput, ImageSizeSelector, QuadImageToggle } from './ChatInputToolbarControls';

export interface ChatInputToolbarProps {
  isImagenModel: boolean;
  isGemini3ImageModel?: boolean;
  aspectRatio?: string;
  setAspectRatio?: (ratio: string) => void;
  imageSize?: string;
  setImageSize?: (size: string) => void;
  fileError: string | null;
  showAddByIdInput: boolean;
  fileIdInput: string;
  setFileIdInput: (value: string) => void;
  onAddFileByIdSubmit: () => void;
  onCancelAddById: () => void;
  isAddingById: boolean;
  showAddByUrlInput: boolean;
  urlInput: string;
  setUrlInput: (value: string) => void;
  onAddUrlSubmit: () => void;
  onCancelAddUrl: () => void;
  isAddingByUrl: boolean;
  isLoading: boolean;
  t: (key: string) => string;
  generateQuadImages?: boolean;
  onToggleQuadImages?: () => void;
}

export const ChatInputToolbar: React.FC<ChatInputToolbarProps> = ({
  isImagenModel,
  isGemini3ImageModel,
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  fileError,
  showAddByIdInput,
  fileIdInput,
  setFileIdInput,
  onAddFileByIdSubmit,
  onCancelAddById,
  isAddingById,
  showAddByUrlInput,
  urlInput,
  setUrlInput,
  onAddUrlSubmit,
  onCancelAddUrl,
  isAddingByUrl,
  isLoading,
  t,
  generateQuadImages,
  onToggleQuadImages
}) => {
  const showAspectRatio = (isImagenModel || isGemini3ImageModel) && setAspectRatio && aspectRatio;
  const showImageSize = isGemini3ImageModel && setImageSize && imageSize;
  const showQuadToggle = isImagenModel && onToggleQuadImages && generateQuadImages !== undefined;

  return (
    <div className="flex flex-col gap-2">
      {(showAspectRatio || showImageSize || showQuadToggle) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showAspectRatio && <ImagenAspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} t={t as (key: string) => string} />}
            {showImageSize && <ImageSizeSelector imageSize={imageSize} setImageSize={setImageSize} t={t as (key: string) => string} />}
            {showQuadToggle && <QuadImageToggle enabled={generateQuadImages} onToggle={onToggleQuadImages} t={t as (key: string) => string} />}
        </div>
      )}
      {fileError && <div className="p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-error-message)] border border-[var(--theme-bg-danger)] rounded-md">{fileError}</div>}
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
      {showAddByUrlInput && (
        <AddUrlInput
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          onAddUrlSubmit={onAddUrlSubmit}
          onCancel={onCancelAddUrl}
          isAddingByUrl={isAddingByUrl}
          isLoading={isLoading}
          t={t as (key: string) => string}
        />
      )}
    </div>
  );
};
