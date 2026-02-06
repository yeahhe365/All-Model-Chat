
import { useState, useRef } from 'react';
import { UploadedFile, InputCommand } from '../../../types';

export const useChatAuxiliaryState = () => {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'update' | 'resend'>('resend');
    const [commandedInput, setCommandedInput] = useState<InputCommand | null>(null);
    
    // Loading & Async State
    const [loadingSessionIds, setLoadingSessionIds] = useState(new Set<string>());
    const [generatingTitleSessionIds, setGeneratingTitleSessionIds] = useState(new Set<string>());
    const activeJobs = useRef(new Map<string, AbortController>());
    
    // File & Input State
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [appFileError, setAppFileError] = useState<string | null>(null);
    const [isAppProcessingFile, setIsAppProcessingFile] = useState<boolean>(false);
    
    // Settings specific to input context
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [imageSize, setImageSize] = useState<string>('1K');
    const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);
    const [isSwitchingModel, setIsSwitchingModel] = useState<boolean>(false);
    
    // Interaction Refs
    const userScrolledUp = useRef<boolean>(false);
    const fileDraftsRef = useRef<Record<string, UploadedFile[]>>({});

    return {
        editingMessageId, setEditingMessageId,
        editMode, setEditMode,
        commandedInput, setCommandedInput,
        loadingSessionIds, setLoadingSessionIds,
        generatingTitleSessionIds, setGeneratingTitleSessionIds,
        activeJobs,
        selectedFiles, setSelectedFiles,
        appFileError, setAppFileError,
        isAppProcessingFile, setIsAppProcessingFile,
        aspectRatio, setAspectRatio,
        imageSize, setImageSize,
        ttsMessageId, setTtsMessageId,
        isSwitchingModel, setIsSwitchingModel,
        userScrolledUp,
        fileDraftsRef
    };
};
