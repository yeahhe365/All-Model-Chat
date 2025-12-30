
import React from 'react';
import { AddFileByIdInput } from './toolbar/AddFileByIdInput';
import { AddUrlInput } from './toolbar/AddUrlInput';
import { ImagenAspectRatioSelector } from './toolbar/ImagenAspectRatioSelector';
import { ImageSizeSelector } from './toolbar/ImageSizeSelector';
import { QuadImageToggle } from './toolbar/QuadImageToggle';
import { TtsVoiceSelector } from './toolbar/TtsVoiceSelector';
import { MediaResolutionSelector } from './toolbar/MediaResolutionSelector';
import { ChatInputToolbarProps } from '../../../types';

export const ChatInputToolbar: React.FC<ChatInputToolbarProps> = ({
  isImagenModel,
  isGemini3ImageModel,
  isTtsModel,
  ttsVoice,
  setTtsVoice,
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
  onToggleQuadImages,
  supportedAspectRatios,
  supportedImageSizes,
  isNativeAudioModel,
  mediaResolution,
  setMediaResolution
}) => {
  const showAspectRatio = (isImagenModel || isGemini3ImageModel) && setAspectRatio && aspectRatio;
  const showImageSize = supportedImageSizes && supportedImageSizes.length > 0 && setImageSize && imageSize;
  const showQuadToggle = (isImagenModel || isGemini3ImageModel) && onToggleQuadImages && generateQuadImages !== undefined;
  
  // Allow voice selection for both explicit TTS models and Native Audio (Live) models
  const showTtsVoice = (isTtsModel || isNativeAudioModel) && ttsVoice && setTtsVoice;

  // Show Media Resolution selector for Native Audio (Live API) to control stream quality
  const showMediaResolution = isNativeAudioModel && mediaResolution && setMediaResolution;
  
  return (
    <div className="flex flex-col gap-2">
      {(showAspectRatio || showImageSize || showQuadToggle || showTtsVoice || showMediaResolution) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showTtsVoice && <TtsVoiceSelector ttsVoice={ttsVoice!} setTtsVoice={setTtsVoice!} t={t as (key: string) => string} />}
            {showMediaResolution && <MediaResolutionSelector mediaResolution={mediaResolution!} setMediaResolution={setMediaResolution!} t={t as (key: string) => string} isNativeAudioModel={isNativeAudioModel} />}
            {showAspectRatio && <ImagenAspectRatioSelector aspectRatio={aspectRatio!} setAspectRatio={setAspectRatio!} t={t as (key: string) => string} supportedRatios={supportedAspectRatios} />}
            {showImageSize && <ImageSizeSelector imageSize={imageSize!} setImageSize={setImageSize!} t={t as (key: string) => string} supportedSizes={supportedImageSizes} />}
            {showQuadToggle && <QuadImageToggle enabled={generateQuadImages!} onToggle={onToggleQuadImages!} t={t as (key: string) => string} />}
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
