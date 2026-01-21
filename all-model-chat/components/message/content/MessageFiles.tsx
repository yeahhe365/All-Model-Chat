import React, { useMemo } from 'react';
import { UploadedFile } from '../../../types';
import { FileDisplay } from '../FileDisplay';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../../../constants/fileConstants';

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

    // Separate images from other documents to handle layouts differently
    const { imageFiles, documentFiles } = useMemo(() => {
        const imgs: UploadedFile[] = [];
        const docs: UploadedFile[] = [];
        files.forEach(f => {
            const isImg = SUPPORTED_IMAGE_MIME_TYPES.includes(f.type) || f.type === 'image/svg+xml';
            if (isImg) imgs.push(f);
            else docs.push(f);
        });
        return { imageFiles: imgs, documentFiles: docs };
    }, [files]);

    const isQuadImageView = imageFiles.length === 4 && imageFiles.every(f => f.name.startsWith('generated-image-') || f.name.startsWith('edited-image-'));
    const marginClass = hasContentOrAudio ? 'mb-2' : '';

    return (
        <div className={`flex flex-col gap-2 ${marginClass}`}>
            {/* 1. Images Section (Retain existing horizontal/grid layout) */}
            {imageFiles.length > 0 && (
                isQuadImageView ? (
                    <div className="grid grid-cols-2 gap-2">
                        {imageFiles.map((file) => (
                            <FileDisplay 
                                key={file.id} 
                                file={file} 
                                onFileClick={onImageClick} 
                                isFromMessageList={true} 
                                isGridView={true} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-row gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
                        {imageFiles.map((file) => (
                            <div key={file.id} className="flex-shrink-0">
                                <FileDisplay 
                                    file={file} 
                                    onFileClick={onImageClick} 
                                    isFromMessageList={true}
                                    onConfigure={onConfigureFile ? () => onConfigureFile(file, messageId) : undefined}
                                    isGemini3={isGemini3}
                                />
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* 2. Documents/Other Files Section (Columnar Layout: Max 4 rows, flow col) */}
            {documentFiles.length > 0 && (
                <div 
                    className="grid grid-flow-col gap-2 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar w-fit max-w-full"
                    style={{
                        // Limit to 4 rows max, or fewer if not enough files to fill 4 rows
                        gridTemplateRows: `repeat(${Math.min(documentFiles.length, 4)}, min-content)`
                    }}
                >
                    {documentFiles.map((file) => (
                        <div key={file.id} className="flex-shrink-0 w-full min-w-[200px] max-w-[260px]">
                            <FileDisplay 
                                file={file} 
                                onFileClick={onImageClick} 
                                isFromMessageList={true}
                                onConfigure={onConfigureFile ? () => onConfigureFile(file, messageId) : undefined}
                                isGemini3={isGemini3}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
