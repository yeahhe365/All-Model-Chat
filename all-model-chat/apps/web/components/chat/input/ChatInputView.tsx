
import React from 'react';
import { createPortal } from 'react-dom';
import { ChatInputModals } from './ChatInputModals';
import { ChatInputFileModals } from './ChatInputFileModals';
import { ChatInputArea } from './ChatInputArea';
import { useChatInputController } from '../../../hooks/chat-input/useChatInputController';

type ControllerResult = ReturnType<typeof useChatInputController>;

export const ChatInputView: React.FC<ControllerResult> = ({
    areaProps,
    modalsProps,
    fileModalsProps,
    liveSessionProps,
    viewState
}) => {
    const { isFullscreen, targetDocument } = viewState;

    // Inject live status into areaProps for the banner
    const extendedAreaProps = {
        ...areaProps,
        liveStatusProps: {
            isConnected: liveSessionProps.isConnected,
            isSpeaking: liveSessionProps.isSpeaking,
            volume: liveSessionProps.volume,
            error: liveSessionProps.error,
            onDisconnect: liveSessionProps.onDisconnect,
        },
        actionsProps: {
            ...areaProps.actionsProps,
            isLiveConnected: liveSessionProps.isConnected
        }
    };

    const chatInputContent = <ChatInputArea {...extendedAreaProps} />;

    return (
        <>
            <ChatInputModals
                showRecorder={modalsProps.showRecorder}
                onAudioRecord={modalsProps.onAudioRecord}
                onRecorderCancel={modalsProps.onRecorderCancel}
                showCreateTextFileEditor={modalsProps.showCreateTextFileEditor}
                onConfirmCreateTextFile={modalsProps.onConfirmCreateTextFile}
                onCreateTextFileCancel={modalsProps.onCreateTextFileCancel}
                isHelpModalOpen={modalsProps.isHelpModalOpen}
                onHelpModalClose={modalsProps.onHelpModalClose}
                allCommandsForHelp={modalsProps.allCommandsForHelp}
                isProcessingFile={modalsProps.isProcessingFile}
                isLoading={modalsProps.isLoading}
                t={modalsProps.t}
                initialContent={modalsProps.editingFile?.textContent || ''}
                initialFilename={modalsProps.editingFile?.name || ''}
                showTtsContextEditor={modalsProps.showTtsContextEditor}
                onCloseTtsContextEditor={modalsProps.onCloseTtsContextEditor}
                ttsContext={modalsProps.ttsContext}
                setTtsContext={modalsProps.setTtsContext}
            />

            <ChatInputFileModals {...fileModalsProps} />

            {isFullscreen ? createPortal(chatInputContent, targetDocument.body) : chatInputContent}
        </>
    );
};
