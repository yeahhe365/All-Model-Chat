
import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { UploadedFile, VideoMetadata } from '../../types';
import { MediaResolution } from '../../types/settings';
import { FileConfigHeader } from './file-config/FileConfigHeader';
import { ResolutionConfig } from './file-config/ResolutionConfig';
import { VideoConfig } from './file-config/VideoConfig';
import { FileConfigFooter } from './file-config/FileConfigFooter';

interface FileConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: UploadedFile | null;
    onSave: (fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;
    t: (key: string) => string;
    isGemini3: boolean;
}

type FileConfigurationModalContentProps = Omit<FileConfigurationModalProps, 'isOpen' | 'file'> & {
    file: UploadedFile;
};

const FileConfigurationModalContent: React.FC<FileConfigurationModalContentProps> = ({ onClose, file, onSave, t, isGemini3 }) => {
    // Video Metadata
    const [startOffset, setStartOffset] = useState(file.videoMetadata?.startOffset || '');
    const [endOffset, setEndOffset] = useState(file.videoMetadata?.endOffset || '');
    const [fps, setFps] = useState(file.videoMetadata?.fps ? String(file.videoMetadata.fps) : '');
    
    // Media Resolution
    const [mediaResolution, setMediaResolution] = useState<MediaResolution | ''>(file.mediaResolution || '');

    const handleSave = () => {
        if (!file) return;
        
        const updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution } = {};

        // Process Video Metadata
        if (file.type.startsWith('video/')) {
            const normalize = (val: string) => {
                val = val.trim();
                if (!val) return undefined;
                if (/^\d+$/.test(val)) return `${val}s`; 
                return val;
            };

            const metadata: VideoMetadata = {
                startOffset: normalize(startOffset),
                endOffset: normalize(endOffset)
            };

            const fpsNum = parseFloat(fps);
            if (!isNaN(fpsNum) && fpsNum > 0) {
                metadata.fps = fpsNum;
            }
            
            // Only update if there are changes or it was previously set
            if (Object.keys(metadata).length > 0 || file.videoMetadata) {
                updates.videoMetadata = metadata;
            }
        }

        // Process Resolution (Gemini 3 Only)
        if (isGemini3 && mediaResolution) {
            updates.mediaResolution = mediaResolution as MediaResolution;
        } else if (isGemini3 && file.mediaResolution && !mediaResolution) {
            // If clearing setting
            updates.mediaResolution = undefined;
        }

        onSave(file.id, updates);
        onClose();
    };

    const isVideo = file.type.startsWith('video/');
    // Supported types for per-part resolution: Images, Video, PDF
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const showResolutionSettings = isGemini3 && (isImage || isVideo || isPdf);

    return (
        <Modal isOpen={true} onClose={onClose} contentClassName="bg-[var(--theme-bg-primary)] rounded-xl shadow-2xl max-w-md w-full border border-[var(--theme-border-primary)]">
            <FileConfigHeader 
                onClose={onClose} 
                t={t} 
                showResolutionSettings={showResolutionSettings} 
                isVideo={isVideo} 
            />
            
            <div className="p-6 space-y-6">
                {showResolutionSettings && (
                    <ResolutionConfig 
                        mediaResolution={mediaResolution} 
                        setMediaResolution={(val) => setMediaResolution(val)} 
                        t={t} 
                    />
                )}

                {isVideo && (
                    <VideoConfig 
                        startOffset={startOffset} setStartOffset={setStartOffset}
                        endOffset={endOffset} setEndOffset={setEndOffset}
                        fps={fps} setFps={setFps}
                        t={t}
                    />
                )}

                <FileConfigFooter onClose={onClose} onSave={handleSave} t={t} />
            </div>
        </Modal>
    );
};

export const FileConfigurationModal: React.FC<FileConfigurationModalProps> = ({ isOpen, file, ...props }) => {
    if (!isOpen || !file) return null;

    return <FileConfigurationModalContent key={file.id} file={file} {...props} />;
};
