
import React from 'react';
import { UploadedFile } from '../../../types';
import { Plus, X, Image as ImageIcon, FileText } from 'lucide-react';
import { formatFileSize } from '../../../utils/appUtils';
import { ALL_SUPPORTED_MIME_TYPES } from '../../../constants/fileConstants';

interface TokenCountFilesProps {
    files: UploadedFile[];
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (id: string) => void;
    t: (key: string) => string;
}

export const TokenCountFiles: React.FC<TokenCountFilesProps> = ({
    files,
    fileInputRef,
    onFileChange,
    onRemoveFile,
    t
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-[var(--theme-text-tertiary)] tracking-wider">
                    {t('tokenModal_files')}
                </label>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1 text-[var(--theme-text-link)] hover:underline"
                >
                    <Plus size={12} /> {t('add')}
                </button>
                <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={onFileChange} 
                    className="hidden" 
                    accept={ALL_SUPPORTED_MIME_TYPES.join(',')} 
                />
            </div>
            
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map(file => (
                        <div key={file.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--theme-bg-tertiary)]/50 border border-[var(--theme-border-secondary)] rounded-md text-xs group">
                            <span className="text-[var(--theme-text-secondary)]">
                                {file.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                            </span>
                            <span className="max-w-[150px] truncate text-[var(--theme-text-primary)]" title={file.name}>{file.name}</span>
                            <span className="text-[var(--theme-text-tertiary)]">({formatFileSize(file.size)})</span>
                            <button 
                                onClick={() => onRemoveFile(file.id)}
                                className="ml-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
