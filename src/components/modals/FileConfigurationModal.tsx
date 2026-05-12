import React, { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { type UploadedFile, type VideoMetadata } from '@/types';
import { type MediaResolution } from '@/types/settings';
import { FileConfigHeader } from './file-config/FileConfigHeader';
import { ResolutionConfig } from './file-config/ResolutionConfig';
import { VideoConfig } from './file-config/VideoConfig';
import { FileConfigFooter } from './file-config/FileConfigFooter';
import { getFileKindFlags } from '@/utils/fileTypeUtils';

interface FileConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UploadedFile | null;
  onSave: (fileId: string, updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution }) => void;
  isGemini3: boolean;
}

interface FileConfigurationDraft {
  startOffset: string;
  endOffset: string;
  fps: string;
  mediaResolution: MediaResolution | '';
}

const buildDraft = (file: UploadedFile): FileConfigurationDraft => ({
  startOffset: file.videoMetadata?.startOffset || '',
  endOffset: file.videoMetadata?.endOffset || '',
  fps: file.videoMetadata?.fps ? String(file.videoMetadata.fps) : '',
  mediaResolution: file.mediaResolution || '',
});

type FileConfigurationModalContentProps = Omit<FileConfigurationModalProps, 'file'> & {
  file: UploadedFile;
};

const FileConfigurationModalContent: React.FC<FileConfigurationModalContentProps> = ({
  isOpen,
  onClose,
  file,
  onSave,
  isGemini3,
}) => {
  const [draft, setDraft] = useState<FileConfigurationDraft>(() => buildDraft(file));
  const { isVideo, isYoutube, isImage, isPdf } = getFileKindFlags(file);
  const supportsVideoConfiguration = isVideo || isYoutube;

  const handleSave = () => {
    const updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution } = {};

    if (supportsVideoConfiguration) {
      const normalize = (value: string) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return undefined;
        if (/^\d+$/.test(trimmedValue)) return `${trimmedValue}s`;
        return trimmedValue;
      };

      const metadata: VideoMetadata = {};
      const normalizedStartOffset = normalize(draft.startOffset);
      const normalizedEndOffset = normalize(draft.endOffset);

      if (normalizedStartOffset) {
        metadata.startOffset = normalizedStartOffset;
      }

      if (normalizedEndOffset) {
        metadata.endOffset = normalizedEndOffset;
      }

      const fpsNum = parseFloat(draft.fps);
      if (!isNaN(fpsNum) && fpsNum > 0) {
        metadata.fps = fpsNum;
      }

      if (Object.keys(metadata).length > 0) {
        updates.videoMetadata = metadata;
      } else if (file.videoMetadata) {
        updates.videoMetadata = undefined;
      }
    }

    if (isGemini3 && draft.mediaResolution) {
      updates.mediaResolution = draft.mediaResolution as MediaResolution;
    } else if (isGemini3 && file.mediaResolution && !draft.mediaResolution) {
      updates.mediaResolution = undefined;
    }

    onSave(file.id, updates);
    onClose();
  };

  const showResolutionSettings = isGemini3 && (isImage || supportsVideoConfiguration || isPdf);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl max-w-md w-full border border-[var(--theme-border-primary)]"
    >
      <FileConfigHeader
        onClose={onClose}
        showResolutionSettings={showResolutionSettings}
        isVideo={supportsVideoConfiguration}
      />

      <div className="p-6 space-y-6">
        {showResolutionSettings && (
          <ResolutionConfig
            mediaResolution={draft.mediaResolution}
            setMediaResolution={(value) => setDraft((prev) => ({ ...prev, mediaResolution: value }))}
            allowUltraHigh={isImage}
          />
        )}

        {supportsVideoConfiguration && (
          <VideoConfig
            startOffset={draft.startOffset}
            setStartOffset={(value) => setDraft((prev) => ({ ...prev, startOffset: value }))}
            endOffset={draft.endOffset}
            setEndOffset={(value) => setDraft((prev) => ({ ...prev, endOffset: value }))}
            fps={draft.fps}
            setFps={(value) => setDraft((prev) => ({ ...prev, fps: value }))}
          />
        )}

        <FileConfigFooter onClose={onClose} onSave={handleSave} />
      </div>
    </Modal>
  );
};

export const FileConfigurationModal: React.FC<FileConfigurationModalProps> = (props) => {
  const { file, isOpen } = props;

  if (!file) return null;

  return <FileConfigurationModalContent key={`${file.id}:${isOpen ? 'open' : 'closed'}`} {...props} file={file} />;
};
