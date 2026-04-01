
import { useState, useEffect, useCallback, useRef } from 'react';
import { UploadedFile, AppSettings, ModelOption } from '../../types';
import { generateUniqueId, getKeyForRequest, buildContentParts } from '../../utils/appUtils';
import { geminiServiceInstance } from '../../services/geminiService';

interface UseTokenCountLogicProps {
    isOpen: boolean;
    initialText: string;
    initialFiles: UploadedFile[];
    appSettings: AppSettings;
    currentModelId: string;
}

export const useTokenCountLogic = ({
    isOpen,
    initialText,
    initialFiles,
    appSettings,
    currentModelId,
}: UseTokenCountLogicProps) => {
    const [text, setText] = useState('');
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [selectedModelId, setSelectedModelId] = useState(currentModelId);
    const [tokenCount, setTokenCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const performCalculation = useCallback(async (txt: string, fls: UploadedFile[], modelId: string) => {
        if (!txt.trim() && fls.length === 0) return;
        
        setIsLoading(true);
        setError(null);
        setTokenCount(null);

        const tempSettings = { ...appSettings, modelId: modelId };
        const keyResult = getKeyForRequest(appSettings, tempSettings, { skipIncrement: true });

        if ('error' in keyResult) {
            setError(keyResult.error);
            setIsLoading(false);
            return;
        }

        try {
            const { contentParts } = await buildContentParts(txt, fls, modelId, appSettings.mediaResolution);
            
            if (contentParts.length === 0) {
                setTokenCount(0);
                return;
            }

            const count = await geminiServiceInstance.countTokens(keyResult.key, modelId, contentParts);
            setTokenCount(count);
        } catch (err) {
            console.error("Token calculation failed", err);
            setError(err instanceof Error ? err.message : "Failed to calculate tokens");
        } finally {
            setIsLoading(false);
        }
    }, [appSettings]);

    useEffect(() => {
        if (isOpen) {
            setText(initialText);
            const shallowFiles = [...initialFiles];
            setFiles(shallowFiles);
            setSelectedModelId(currentModelId);
            setTokenCount(null);
            setError(null);

            if (initialText.trim() || shallowFiles.length > 0) {
                performCalculation(initialText, shallowFiles, currentModelId);
            }
        }
    }, [isOpen, initialText, initialFiles, currentModelId, performCalculation]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                id: generateUniqueId(),
                name: file.name,
                type: file.type,
                size: file.size,
                rawFile: file,
                dataUrl: URL.createObjectURL(file),
                uploadState: 'active' as const
            }));
            setFiles(prev => [...prev, ...newFiles]);
            setTokenCount(null);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        setTokenCount(null);
    };

    const clearAll = () => {
        setText('');
        setFiles([]);
        setTokenCount(null);
    };

    const handleCalculateClick = () => {
        performCalculation(text, files, selectedModelId);
    };

    const handleModelSelect = (id: string) => {
        setSelectedModelId(id);
        setTokenCount(null);
    };

    return {
        text, setText,
        files,
        selectedModelId,
        tokenCount,
        isLoading,
        error,
        fileInputRef,
        handleFileChange,
        removeFile,
        clearAll,
        handleCalculateClick,
        handleModelSelect,
        setTokenCount
    };
};
