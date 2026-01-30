
import { useState } from 'react';
import { UploadedFile } from '../../types';

interface UseChatInputLocalStateProps {
    setSelectedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    handleConfirmCreateTextFile: (content: string | Blob, filename: string) => Promise<void>;
    setShowCreateTextFileEditor: (show: boolean) => void;
    setEditingFile: (file: UploadedFile | null) => void;
    editingFile: UploadedFile | null;
}

export const useChatInputLocalState = ({
    setSelectedFiles,
    handleConfirmCreateTextFile,
    setShowCreateTextFileEditor,
    setEditingFile,
    editingFile
}: UseChatInputLocalStateProps) => {
    const [configuringFile, setConfiguringFile] = useState<UploadedFile | null>(null);
    const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
    const [isPreviewEditable, setIsPreviewEditable] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [showTokenModal, setShowTokenModal] = useState(false);

    const handleSaveTextFile = async (content: string | Blob, filename: string) => {
        if (editingFile) {
            // Note: If content is a Blob (PDF), we essentially overwrite the text file with a binary file.
            // Editing functionality for PDFs isn't fully supported in this flow, but this handles the save.
            const size = content instanceof Blob ? content.size : content.length;
            const type = content instanceof Blob ? content.type : 'text/markdown'; // Fallback if string
            
            setSelectedFiles(prev => prev.map(f => f.id === editingFile.id ? {
                ...f,
                // Default to .md if no extension provided, otherwise respect input
                name: filename.includes('.') ? filename : `${filename}.md`,
                textContent: typeof content === 'string' ? content : undefined,
                size: size,
                rawFile: new File([content], filename, { type: type }),
                // If it became a binary blob (PDF), ensure we have a dataUrl for preview if possible
                dataUrl: content instanceof Blob ? URL.createObjectURL(content) : f.dataUrl
            } : f));
            setShowCreateTextFileEditor(false);
            setEditingFile(null);
        } else {
            await handleConfirmCreateTextFile(content, filename);
        }
    };

    const handleSavePreviewTextFile = (fileId: string, content: string, newName: string) => {
        setSelectedFiles(prev => prev.map(f => f.id === fileId ? {
            ...f,
            name: newName,
            textContent: content,
            size: content.length,
            dataUrl: URL.createObjectURL(new File([content], newName, { type: 'text/plain' })),
            rawFile: new File([content], newName, { type: 'text/plain' })
        } : f));
    };

    const handleConfigureFile = (file: UploadedFile) => {
        const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.type === 'application/json' || file.type.includes('xml') || file.type.includes('javascript') || file.name.endsWith('.md');
        if (isText) {
            setPreviewFile(file);
            setIsPreviewEditable(true);
        } else {
            setConfiguringFile(file);
        }
    };

    const handlePreviewFile = (file: UploadedFile) => {
        setPreviewFile(file);
        setIsPreviewEditable(false);
    };

    return {
        configuringFile, setConfiguringFile,
        previewFile, setPreviewFile,
        isPreviewEditable, setIsPreviewEditable,
        isConverting, setIsConverting,
        showTokenModal, setShowTokenModal,
        handleSaveTextFile,
        handleSavePreviewTextFile,
        handleConfigureFile,
        handlePreviewFile
    };
};
