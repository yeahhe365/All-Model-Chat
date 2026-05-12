import React from 'react';
import { AddFileByIdInput } from './toolbar/AddFileByIdInput';
import { AddUrlInput } from './toolbar/AddUrlInput';
import { ImagenAspectRatioSelector } from './toolbar/ImagenAspectRatioSelector';
import { ImageSizeSelector } from './toolbar/ImageSizeSelector';
import { ImageOutputModeSelector } from './toolbar/ImageOutputModeSelector';
import { PersonGenerationSelector } from './toolbar/PersonGenerationSelector';
import { QuadImageToggle } from './toolbar/QuadImageToggle';
import { TtsVoiceSelector } from './toolbar/TtsVoiceSelector';
import { MediaResolutionSelector } from './toolbar/MediaResolutionSelector';
import { Clapperboard } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useChatInputToolbarContext } from './ChatInputContext';
import { useI18n } from '@/contexts/I18nContext';

const ChatInputToolbarComponent: React.FC = () => {
  const { t } = useI18n();
  const {
    appSettings,
    currentChatSettings,
    capabilities,
    isLoading,
    setCurrentChatSettings,
    onToggleQuadImages,
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
    ttsContext,
    onEditTtsContext,
  } = useChatInputToolbarContext();
  const {
    isImagenModel,
    isGemini3ImageModel,
    isRealImagenModel,
    isTtsModel,
    isNativeAudioModel,
    supportedAspectRatios,
    supportedImageSizes,
  } = capabilities;
  const aspectRatio = useChatStore((state) => state.aspectRatio);
  const setAspectRatio = useChatStore((state) => state.setAspectRatio);
  const imageSize = useChatStore((state) => state.imageSize);
  const setImageSize = useChatStore((state) => state.setImageSize);
  const imageOutputMode = useChatStore((state) => state.imageOutputMode);
  const setImageOutputMode = useChatStore((state) => state.setImageOutputMode);
  const personGeneration = useChatStore((state) => state.personGeneration);
  const setPersonGeneration = useChatStore((state) => state.setPersonGeneration);
  const fileError = useChatStore((state) => state.appFileError);
  const ttsVoice = currentChatSettings.ttsVoice;
  const mediaResolution = currentChatSettings.mediaResolution;
  const generateQuadImages = appSettings.generateQuadImages ?? false;
  const setTtsVoice = (voice: string) => setCurrentChatSettings((prev) => ({ ...prev, ttsVoice: voice }));
  const setMediaResolution = (res: typeof mediaResolution) =>
    setCurrentChatSettings((prev) => ({ ...prev, mediaResolution: res }));
  const showAspectRatio = (isImagenModel || isGemini3ImageModel) && !!aspectRatio;
  const showImageSize = supportedImageSizes && supportedImageSizes.length > 0 && !!imageSize;
  const showImageOutputMode = isImagenModel && !isRealImagenModel && !!imageOutputMode;
  const showPersonGeneration = isRealImagenModel && !!personGeneration;
  const showQuadToggle = (isImagenModel || isGemini3ImageModel) && generateQuadImages !== undefined;

  // Allow voice selection for both explicit TTS models and Native Audio (Live) models
  const showTtsVoice = (isTtsModel || isNativeAudioModel) && ttsVoice && setTtsVoice;

  // Show Media Resolution selector for Native Audio (Live API) to control stream quality
  const showMediaResolution = isNativeAudioModel && mediaResolution && setMediaResolution;

  const hasVisibleContent =
    showAspectRatio ||
    showImageSize ||
    showImageOutputMode ||
    showPersonGeneration ||
    showQuadToggle ||
    showTtsVoice ||
    showMediaResolution ||
    fileError ||
    showAddByIdInput ||
    showAddByUrlInput;

  return (
    <div className={`flex flex-col gap-1.5 ${hasVisibleContent ? 'mb-1' : ''}`}>
      {(showAspectRatio ||
        showImageSize ||
        showImageOutputMode ||
        showPersonGeneration ||
        showQuadToggle ||
        showTtsVoice ||
        showMediaResolution) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {showTtsVoice && <TtsVoiceSelector ttsVoice={ttsVoice!} setTtsVoice={setTtsVoice!} />}
          {isTtsModel && (
            <button
              onClick={onEditTtsContext}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)] ${
                ttsContext && ttsContext.trim()
                  ? 'bg-[var(--theme-bg-accent)]/10 text-[var(--theme-text-link)] border-[var(--theme-border-focus)] font-medium'
                  : 'bg-[var(--theme-bg-input)] text-[var(--theme-text-primary)] border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-focus)]'
              }`}
              title={t('ttsDirectorNotes_title')}
            >
              <div className="flex items-center gap-2">
                <Clapperboard
                  size={16}
                  strokeWidth={1.5}
                  className={
                    ttsContext && ttsContext.trim()
                      ? 'text-[var(--theme-text-link)]'
                      : 'text-[var(--theme-text-tertiary)]'
                  }
                />
                <span>{t('ttsDirectorNotes_context')}</span>
              </div>
              {ttsContext && ttsContext.trim() && (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-link)]" />
              )}
            </button>
          )}
          {showMediaResolution && (
            <MediaResolutionSelector
              mediaResolution={mediaResolution!}
              setMediaResolution={setMediaResolution!}
              isNativeAudioModel={isNativeAudioModel}
            />
          )}
          {showAspectRatio && (
            <ImagenAspectRatioSelector
              aspectRatio={aspectRatio!}
              setAspectRatio={setAspectRatio!}
              supportedRatios={supportedAspectRatios}
            />
          )}
          {showImageSize && (
            <ImageSizeSelector
              imageSize={imageSize!}
              setImageSize={setImageSize!}
              supportedSizes={supportedImageSizes}
            />
          )}
          {showImageOutputMode && (
            <ImageOutputModeSelector imageOutputMode={imageOutputMode!} setImageOutputMode={setImageOutputMode!} />
          )}
          {showPersonGeneration && (
            <PersonGenerationSelector personGeneration={personGeneration!} setPersonGeneration={setPersonGeneration!} />
          )}
          {showQuadToggle && <QuadImageToggle enabled={generateQuadImages!} onToggle={onToggleQuadImages!} />}
        </div>
      )}
      {fileError && (
        <div className="p-2 text-sm text-[var(--theme-text-danger)] bg-[var(--theme-bg-error-message)] border border-[var(--theme-bg-danger)] rounded-md">
          {fileError}
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
        />
      )}
    </div>
  );
};

export const ChatInputToolbar = React.memo(ChatInputToolbarComponent);
