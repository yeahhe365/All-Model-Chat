import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { UploadedFile } from '../../types';
import { ChevronLeft, ChevronRight, FileCode2, FileAudio } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { Modal } from '../shared/Modal';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { FilePreviewHeader } from '../shared/file-preview/FilePreviewHeader';
import { ImageViewer } from '../shared/file-preview/ImageViewer';
import { TextFileViewer } from '../shared/file-preview/TextFileViewer';
import { IconYoutube } from '../icons/CustomIcons';
import { copyFileToClipboard } from '../../utils/fileHelpers';

const LazyPdfViewer = lazy(async () => {
    const module = await import('../shared/file-preview/PdfViewer');
    return { default: module.PdfViewer };
});

interface FilePreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onSaveText?: (fileId: string, content: string, newName: string) => void;
  initialEditMode?: boolean;
}

interface FilePreviewModalContentProps extends Omit<FilePreviewModalProps, 'file'> {
  file: UploadedFile;
}

const FilePreviewModalContent: React.FC<FilePreviewModalContentProps> = ({
    file,
    onClose,
    t,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false,
    onSaveText,
    initialEditMode = false,
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editedContent, setEditedContent] = useState(file.textContent ?? '');
  const [editedName, setEditedName] = useState(file.name);
  const [textContentLoaded, setTextContentLoaded] = useState(file.textContent !== undefined);

  const handleCopyShortcut = useCallback(async () => {
      if (!file.dataUrl) return;
      try {
          await copyFileToClipboard(file);
      } catch (err) {
          console.error('Failed to copy content:', err);
      }
  }, [file]);

  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          if (isEditing) return;

          if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
              event.preventDefault();
              void handleCopyShortcut();
              return;
          }

          if (event.key === 'ArrowLeft' && hasPrev && onPrev) {
              event.preventDefault();
              onPrev();
          } else if (event.key === 'ArrowRight' && hasNext && onNext) {
              event.preventDefault();
              onNext();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyShortcut, hasNext, hasPrev, isEditing, onNext, onPrev]);

  const handleSave = useCallback(() => {
      if (!onSaveText) {
          return;
      }

      onSaveText(file.id, editedContent, editedName);
      setIsEditing(false);
  }, [editedContent, editedName, file.id, onSaveText]);

  const handleToggleEdit = useCallback(() => {
      if (isEditing) {
          setIsEditing(false);
          setEditedName(file.name);
          setEditedContent(file.textContent ?? '');
          setTextContentLoaded(file.textContent !== undefined);
          return;
      }

      setIsEditing(true);
  }, [file, isEditing]);

  const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || file.type === 'image/svg+xml';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isVideo = file.type.startsWith('video/') && file.type !== 'video/youtube-link';
  const isYoutube = file.type === 'video/youtube-link';
  const isAudio = file.type.startsWith('audio/');
  const isText =
      !isImage &&
      (file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type.includes('javascript') ||
        file.type.includes('xml'));

  const navButtonClass =
      'absolute top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/60 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all active:scale-95 z-50 focus:outline-none';

  const getYoutubeEmbedUrl = (url: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      noPadding
      backdropClassName="bg-black/95 backdrop-blur-sm"
      contentClassName="w-full h-full"
    >
      <div className="w-full h-full relative flex flex-col">
        <h2 id="file-preview-modal-title" className="sr-only">
          {t('imageZoom_title').replace('{filename}', file.name)}
        </h2>

        <FilePreviewHeader
          file={file}
          onClose={onClose}
          t={t as (key: string) => string}
          isEditable={isEditing}
          onToggleEdit={isText && onSaveText ? handleToggleEdit : undefined}
          onSave={handleSave}
          editedName={editedName}
          onNameChange={setEditedName}
        />

        {!isEditing && hasPrev && onPrev && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onPrev();
            }}
            className={`${navButtonClass} left-2`}
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {!isEditing && hasNext && onNext && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className={`${navButtonClass} right-2`}
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div className="flex-grow w-full h-full overflow-hidden relative">
          {isImage ? (
              <ImageViewer file={file} />
          ) : isText ? (
              <TextFileViewer
                  file={file}
                  isEditable={isEditing}
                  onChange={setEditedContent}
                  onLoad={(content) => {
                      if (!textContentLoaded) {
                          setEditedContent(content);
                          setTextContentLoaded(true);
                      }
                  }}
                  content={isEditing && textContentLoaded ? editedContent : undefined}
              />
          ) : isPdf ? (
             <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/70">Loading PDF viewer...</div>}>
                <LazyPdfViewer file={file} />
             </Suspense>
          ) : isVideo ? (
              <div className="w-full h-full flex items-center justify-center">
                {file.dataUrl && (
                  <video
                      src={file.dataUrl}
                      controls
                      className="max-w-[90%] max-h-[80%] rounded-lg shadow-2xl outline-none"
                      playsInline
                  />
                )}
              </div>
          ) : isYoutube ? (
              <div className="w-full h-full flex items-center justify-center p-4 pt-20 pb-20">
                  {file.fileUri && getYoutubeEmbedUrl(file.fileUri) ? (
                      <iframe
                          src={getYoutubeEmbedUrl(file.fileUri)!}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full max-w-5xl max-h-[80vh] rounded-xl shadow-2xl bg-black"
                      />
                  ) : (
                      <div className="text-center text-white/50">
                          <IconYoutube size={64} className="mx-auto mb-4 opacity-50" />
                          <p>Invalid YouTube URL</p>
                      </div>
                  )}
              </div>
          ) : isAudio ? (
              <div className="w-full h-full flex items-center justify-center">
                {file.dataUrl && (
                  <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center gap-4">
                      <FileAudio size={64} className="text-white/50" />
                      <audio
                          src={file.dataUrl}
                          controls
                          className="w-[300px] sm:w-[400px]"
                      />
                  </div>
                )}
              </div>
          ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50 flex-col gap-2">
                  <FileCode2 size={48} />
                  <p>Preview not available for this file type.</p>
              </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    file,
    onClose,
    t,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false,
    onSaveText,
    initialEditMode = false,
}) => {
    if (!file) {
        return null;
    }

    return (
        <FilePreviewModalContent
            key={`${file.id}:${initialEditMode ? 'edit' : 'view'}`}
            file={file}
            onClose={onClose}
            t={t}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onSaveText={onSaveText}
            initialEditMode={initialEditMode}
        />
    );
};
