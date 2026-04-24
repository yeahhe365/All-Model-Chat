
import React, { Suspense, lazy } from 'react';
import { UploadedFile, AppSettings, ModelOption } from '../../../types';
import { FileConfigurationModal } from '../../modals/FileConfigurationModal';
import { VideoMetadata } from '../../../types';
import { MediaResolution } from '../../../types/settings';
import { isMarkdownFile } from '../../../utils/fileHelpers';

const LazyTokenCountModal = lazy(async () => {
    const module = await import('../../modals/TokenCountModal');
    return { default: module.TokenCountModal };
});

const LazyFilePreviewModal = lazy(async () => {
    const module = await import('../../modals/FilePreviewModal');
    return { default: module.FilePreviewModal };
});

const LazyMarkdownPreviewModal = lazy(async () => {
    const module = await import('../../modals/MarkdownPreviewModal');
    return { default: module.MarkdownPreviewModal };
});

interface ChatInputFileModalsProps {
    configuringFile: UploadedFile | null;
    setConfiguringFile: (file: UploadedFile | null) => void;
    showTokenModal: boolean;
    setShowTokenModal: (show: boolean) => void;
    previewFile: UploadedFile | null;
    onClosePreview: () => void;
    inputText: string;
    selectedFiles: UploadedFile[];
    appSettings: AppSettings;
    availableModels: ModelOption[];
    currentModelId: string;
    isGemini3: boolean;
    isPreviewEditable?: boolean;
    onSaveTextFile?: (fileId: string, content: string, newName: string) => void;
    handlers: {
        handleSaveFileConfig: (fileId: string, updates: { videoMetadata?: VideoMetadata, mediaResolution?: MediaResolution }) => void;
        handlePrevImage: () => void;
        handleNextImage: () => void;
        currentImageIndex: number;
        inputImages: UploadedFile[];
    };
}

export const ChatInputFileModals: React.FC<ChatInputFileModalsProps> = ({
    configuringFile,
    setConfiguringFile,
    showTokenModal,
    setShowTokenModal,
    previewFile,
    onClosePreview,
    inputText,
    selectedFiles,
    appSettings,
    availableModels,
    currentModelId,
    isGemini3,
    isPreviewEditable,
    onSaveTextFile,
    handlers
}) => {
    const markdownPreviewFile = previewFile && isMarkdownFile(previewFile) ? previewFile : null;
    const genericPreviewFile = previewFile && !isMarkdownFile(previewFile) ? previewFile : null;

    return (
        <>
            <FileConfigurationModal 
                isOpen={!!configuringFile} 
                onClose={() => setConfiguringFile(null)} 
                file={configuringFile}
                onSave={handlers.handleSaveFileConfig}
                isGemini3={isGemini3}
            />

            <Suspense fallback={null}>
                <LazyTokenCountModal
                    isOpen={showTokenModal}
                    onClose={() => setShowTokenModal(false)}
                    initialText={inputText}
                    initialFiles={selectedFiles}
                    appSettings={appSettings}
                    availableModels={availableModels}
                    currentModelId={currentModelId}
                />
            </Suspense>

            <Suspense fallback={null}>
                <LazyFilePreviewModal
                    file={genericPreviewFile}
                    onClose={onClosePreview}
                    onPrev={handlers.handlePrevImage}
                    onNext={handlers.handleNextImage}
                    hasPrev={handlers.currentImageIndex > 0}
                    hasNext={handlers.currentImageIndex !== -1 && handlers.currentImageIndex < handlers.inputImages.length - 1}
                    onSaveText={onSaveTextFile}
                    initialEditMode={isPreviewEditable}
                />
            </Suspense>

            <Suspense fallback={null}>
                <LazyMarkdownPreviewModal
                    file={markdownPreviewFile}
                    onClose={onClosePreview}
                    onSaveText={onSaveTextFile}
                    initialEditMode={isPreviewEditable}
                />
            </Suspense>
        </>
    );
};
