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
import { extractDocxText, isDocxFile } from '../../utils/docxPreview';
import { useSettingsStore } from '../../stores/settingsStore';
import { isShortcutPressed } from '../../utils/shortcutUtils';

const LazyPdfViewer = lazy(async () => {
    const module = await import('../shared/file-preview/PdfViewerEntry');
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
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false,
    onSaveText,
    initialEditMode = false,
}) => {
  const { t } = useI18n();
  const appSettings = useSettingsStore((state) => state.appSettings);
  const isDocxCandidate = isDocxFile(file);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editedContent, setEditedContent] = useState(file.textContent ?? '');
  const [editedName, setEditedName] = useState(file.name);
  const [textContentLoaded, setTextContentLoaded] = useState(file.textContent !== undefined);
  const [docxPreviewContent, setDocxPreviewContent] = useState<string | null>(file.textContent ?? null);
  const [docxPreviewError, setDocxPreviewError] = useState<string | null>(
      isDocxCandidate && file.textContent === undefined && !file.rawFile
          ? t('filePreview_word_unavailable')
          : null,
  );
  const [isDocxPreviewLoading, setIsDocxPreviewLoading] = useState(false);

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

          if (isShortcutPressed(event, 'global.prevFile', appSettings) && hasPrev && onPrev) {
              event.preventDefault();
              onPrev();
          } else if (isShortcutPressed(event, 'global.nextFile', appSettings) && hasNext && onNext) {
              event.preventDefault();
              onNext();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appSettings, handleCopyShortcut, hasNext, hasPrev, isEditing, onNext, onPrev]);

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
  const isDocx = !isImage && !isPdf && !isVideo && !isYoutube && !isAudio && isDocxCandidate;
  const isText =
      !isImage &&
      !isDocx &&
      (file.type.startsWith('text/') ||
        file.type === 'application/json' ||
        file.type.includes('javascript') ||
        file.type.includes('xml'));

  useEffect(() => {
      let cancelled = false;

      if (!isDocx || file.textContent !== undefined) {
          return () => {
              cancelled = true;
          };
      }

      if (!file.rawFile) {
          return () => {
              cancelled = true;
          };
      }

      // Intentional loading-state transition before async preview extraction begins.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDocxPreviewLoading(true);

      void extractDocxText(file.rawFile)
          .then(({ text }) => {
              if (cancelled) return;
              setDocxPreviewContent(text);
          })
           .catch(() => {
               if (cancelled) return;
               setDocxPreviewError(t('filePreview_word_unavailable'));
           })
          .finally(() => {
              if (!cancelled) {
                  setIsDocxPreviewLoading(false);
              }
          });

      return () => {
          cancelled = true;
      };
   }, [file, isDocx, t]);

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
            aria-label={t('filePreview_previous')}
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
            aria-label={t('filePreview_next')}
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div className="flex-grow w-full h-full overflow-hidden relative">
          {isImage ? (
              <ImageViewer file={file} />
          ) : isDocxPreviewLoading ? (
              <div className="w-full h-full flex items-center justify-center text-white/70">
                  {t('filePreview_loading_word')}
              </div>
          ) : isDocx && docxPreviewError ? (
              <div className="w-full h-full flex items-center justify-center text-white/60 px-6 text-center">
                  {docxPreviewError}
              </div>
          ) : isText || isDocx ? (
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
                  content={
                      isDocx
                          ? (isEditing ? editedContent : docxPreviewContent)
                          : (isEditing && textContentLoaded ? editedContent : undefined)
                  }
              />
          ) : isPdf ? (
             <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white/70">{t('filePreview_loading_pdf_viewer')}</div>}>
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
                          title={t('filePreview_youtube_player')}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full max-w-5xl max-h-[80vh] rounded-xl shadow-2xl bg-black"
                      />
                  ) : (
                      <div className="text-center text-white/50">
                          <IconYoutube size={64} className="mx-auto mb-4 opacity-50" />
                          <p>{t('filePreview_invalid_youtube_url')}</p>
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
                  <p>{t('filePreview_not_supported')}</p>
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
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onSaveText={onSaveText}
            initialEditMode={initialEditMode}
        />
    );
};
