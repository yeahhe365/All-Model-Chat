import React from 'react';
import { UploadedFile } from '../../../types';
import { FileDisplay } from '../FileDisplay';

interface MessageFilesProps {
    files: UploadedFile[];
    onImageClick: (file: UploadedFile) => void;
    onConfigureFile?: (file: UploadedFile, messageId: string) => void;
    messageId: string;
    isGemini3?: boolean;
    hasContentOrAudio: boolean;
}

export const MessageFiles: React.FC<MessageFilesProps> = ({ 
    files, 
    onImageClick, 
    onConfigureFile, 
    messageId,
    isGemini3,
    hasContentOrAudio 
}) => {
    if (!files || files.length === 0) return null;

    const isQuadImageView = files.length === 4 && files.every(f => f.name.startsWith('generated-image-') || f.name.startsWith('edited-image-'));
    const marginClass = hasContentOrAudio ? 'mb-1.5 sm:mb-2' : '';

    if (isQuadImageView) {
        return (
            <div className={`grid grid-cols-2 gap-2 ${marginClass}`}>
                {files.map((file) => (
                    <FileDisplay 
                        key={file.id} 
                        file={file} 
                        onFileClick={onImageClick} 
                        isFromMessageList={true} 
                        isGridView={true} 
                    />
                ))}
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${marginClass}`}>
            {files.map((file) => (
                <FileDisplay 
                    key={file.id} 
                    file={file} 
                    onFileClick={onImageClick} 
                    isFromMessageList={true}
                    onConfigure={onConfigureFile ? () => onConfigureFile(file, messageId) : undefined}
                    isGemini3={isGemini3}
                />
            ))}
        </div>
    );
};