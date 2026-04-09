
import React, { Suspense, lazy } from 'react';
import { UploadedFile, AppSettings, ModelOption } from '../../../types';
import { VideoMetadata } from '../../../types';
import { MediaResolution } from '../../../types/settings';

const FileConfigurationModal = lazy(async () => {
    const module = await import('../../modals/FileConfigurationModal');
    return { default: module.FileConfigurationModal };
});

const TokenCountModal = lazy(async () => {
    const module = await import('../../modals/TokenCountModal');
    return { default: module.TokenCountModal };
});

const FilePreviewModal = lazy(async () => {
    const module = await import('../../modals/FilePreviewModal');
    return { default: module.FilePreviewModal };
});

interface ChatInputFileModalsProps {
    configuringFile: UploadedFile | null;
    setConfiguringFile: (file: UploadedFile | null) => void;
    showTokenModal: boolean;
    setShowTokenModal: (show: boolean) => void;
    previewFile: UploadedFile | null;
    setPreviewFile: (file: UploadedFile | null) => void;
    inputText: string;
    selectedFiles: UploadedFile[];
    appSettings: AppSettings;
    availableModels: ModelOption[];
    currentModelId: string;
    t: (key: string) => string;
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
    setPreviewFile,
    inputText,
    selectedFiles,
    appSettings,
    availableModels,
    currentModelId,
    t,
    isGemini3,
    isPreviewEditable,
    onSaveTextFile,
    handlers
}) => {
    return (
        <Suspense fallback={null}>
            {!!configuringFile && (
                <FileConfigurationModal 
                    isOpen={!!configuringFile} 
                    onClose={() => setConfiguringFile(null)} 
                    file={configuringFile}
                    onSave={handlers.handleSaveFileConfig}
                    t={t}
                    isGemini3={isGemini3}
                />
            )}

            {showTokenModal && (
                <TokenCountModal
                    isOpen={showTokenModal}
                    onClose={() => setShowTokenModal(false)}
                    initialText={inputText}
                    initialFiles={selectedFiles}
                    appSettings={appSettings}
                    availableModels={availableModels}
                    currentModelId={currentModelId}
                    t={t}
                />
            )}

            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    onClose={() => setPreviewFile(null)}
                    t={t as any}
                    onPrev={handlers.handlePrevImage}
                    onNext={handlers.handleNextImage}
                    hasPrev={handlers.currentImageIndex > 0}
                    hasNext={handlers.currentImageIndex !== -1 && handlers.currentImageIndex < handlers.inputImages.length - 1}
                    onSaveText={onSaveTextFile}
                    initialEditMode={isPreviewEditable}
                />
            )}
        </Suspense>
    );
};
