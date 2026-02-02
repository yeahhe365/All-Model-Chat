import React from 'react';
import { UploadedFile } from '../../../../types';
import { SelectedFileDisplay } from '../SelectedFileDisplay';
import { useAutoAnimate } from '@formkit/auto-animate/react';

interface ChatFilePreviewListProps {
    selectedFiles: UploadedFile[];
    onRemove: (id: string) => void;
    onCancelUpload: (id: string) => void;
    onConfigure: (file: UploadedFile) => void;
    onPreview: (file: UploadedFile) => void;
    isGemini3?: boolean;
}

export const ChatFilePreviewList: React.FC<ChatFilePreviewListProps> = ({
    selectedFiles,
    onRemove,
    onCancelUpload,
    onConfigure,
    onPreview,
    isGemini3
}) => {
    const [parent] = useAutoAnimate<HTMLDivElement>({
        duration: 200,
        easing: 'ease-in-out'
    });

    if (selectedFiles.length === 0) return null;

    return (
        <div ref={parent} className="flex gap-2 overflow-x-auto pb-2 mb-1 custom-scrollbar px-1 items-start">
            {selectedFiles.map(file => (
                <SelectedFileDisplay 
                    key={file.id} 
                    file={file} 
                    onRemove={onRemove} 
                    onCancelUpload={onCancelUpload}
                    onConfigure={onConfigure}
                    onPreview={onPreview}
                    isGemini3={isGemini3}
                />
            ))}
        </div>
    );
};