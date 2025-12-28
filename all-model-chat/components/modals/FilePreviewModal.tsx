
import React, { useEffect, useState, useCallback } from 'react';
import { UploadedFile } from '../../types';
import { ChevronLeft, ChevronRight, FileCode2, FileAudio, FileVideo, ExternalLink, FileText, Youtube } from 'lucide-react';
import { translations } from '../../utils/appUtils';
import { Modal } from '../shared/Modal';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../constants/fileConstants';
import { FilePreviewHeader } from '../shared/file-preview/FilePreviewHeader';
import { ImageViewer } from '../shared/file-preview/ImageViewer';
import { TextFileViewer } from '../shared/file-preview/TextFileViewer';

interface FilePreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  t: (key: keyof typeof translations) => string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onSaveText?: (fileId: string, content: string, newName: string) => void;
  initialEditMode?: boolean;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ 
    file, onClose, t, 
    onPrev, onNext, hasPrev = false, hasNext = false,
    onSaveText, initialEditMode = false
}) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editedContent, setEditedContent] = useState('');
  const [editedName, setEditedName] = useState('');
  const [textContentLoaded, setTextContentLoaded] = useState(false);

  useEffect(() => {
      if (file) {
          setIsEditing(initialEditMode);
          setEditedName(file.name);
          setEditedContent(''); // Will be populated by onLoad from viewer
          setTextContentLoaded(false);
      }
  }, [file, initialEditMode]);

  // Keyboard navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!file || isEditing) return; // Disable nav when editing
          if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
              e.preventDefault();
              onPrev();
          } else if (e.key === 'ArrowRight' && hasNext && onNext) {
              e.preventDefault();
              onNext();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, hasPrev, hasNext, onPrev, onNext, isEditing]);

  const handleSave = useCallback(() => {
      if (file && onSaveText) {
          onSaveText(file.id, editedContent, editedName);
          setIsEditing(false);
          // Optional: Close modal or just exit edit mode? 
          // Exiting edit mode seems friendlier to review changes.
      }
  }, [file, onSaveText, editedContent, editedName]);

  const handleToggleEdit = useCallback(() => {
      if (isEditing) {
          // Cancel
          setIsEditing(false);
          setEditedName(file?.name || '');
          // Content revert is handled by re-render of viewer with original file, 
          // but we rely on TextFileViewer to re-fetch or re-use cached content.
      } else {
          setIsEditing(true);
      }
  }, [isEditing, file]);

  if (!file) return null;

  const isImage = SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) || file.type === 'image/svg+xml';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isVideo = file.type.startsWith('video/') && file.type !== 'video/youtube-link';
  const isYoutube = file.type === 'video/youtube-link';
  const isAudio = file.type.startsWith('audio/');
  const isText = !isImage && (file.type.startsWith('text/') || file.type === 'application/json' || file.type.includes('javascript') || file.type.includes('xml'));

  const navButtonClass = "absolute top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/60 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all active:scale-95 z-50 focus:outline-none";

  const getYoutubeEmbedUrl = (url: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  return (
    <Modal
      isOpen={!!file}
      onClose={onClose}
      noPadding
      backdropClassName="bg-black/95 backdrop-blur-sm"
      contentClassName="w-full h-full"
    >
      <div className="w-full h-full relative flex flex-col">
        <h2 id="file-preview-modal-title" className="sr-only">{t('imageZoom_title').replace('{filename}', file.name)}</h2>
        
        {/* Header */}
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

        {/* Navigation Buttons - Hide in Edit Mode */}
        {!isEditing && hasPrev && onPrev && (
            <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className={`${navButtonClass} left-2`} aria-label="Previous">
                <ChevronLeft size={24} />
            </button>
        )}
        {!isEditing && hasNext && onNext && (
            <button onClick={(e) => { e.stopPropagation(); onNext(); }} className={`${navButtonClass} right-2`} aria-label="Next">
                <ChevronRight size={24} />
            </button>
        )}

        {/* Content Viewer */}
        <div className="flex-grow w-full h-full overflow-hidden relative">
          {isImage ? (
              <ImageViewer file={file} t={t as (key: string) => string} />
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
                  // If we are editing, we pass current editedContent to keep sync (though TextFileViewer manages internal state usually, 
                  // passing content makes it controlled which is better for save)
                  content={textContentLoaded ? editedContent : undefined}
              />
          ) : isPdf ? (
              <div className="w-full h-full pt-20 pb-20 px-4 sm:px-8 relative group/pdf flex items-center justify-center">
                  {file.dataUrl && (
                    <>
                      <iframe
                          src={file.dataUrl}
                          className="w-full h-full rounded-lg shadow-2xl bg-white"
                          title={`PDF: ${file.name}`}
                      />
                      <a 
                          href={file.dataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 hover:bg-black/80 text-white text-sm rounded-full backdrop-blur-md transition-opacity opacity-0 group-hover/pdf:opacity-100 flex items-center gap-2 pointer-events-auto"
                      >
                          <ExternalLink size={14} />
                          Open in New Tab
                      </a>
                    </>
                  )}
              </div>
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
                          <Youtube size={64} className="mx-auto mb-4 opacity-50" />
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
