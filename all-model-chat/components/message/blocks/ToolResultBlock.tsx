

import React, { useState } from 'react';
import { Download, Check, FileOutput } from 'lucide-react';
import { triggerDownload } from '../../../utils/exportUtils';
import { extractTextFromNode } from '../../../utils/uiUtils';
import { MESSAGE_BLOCK_BUTTON_CLASS } from '../../../constants/appConstants';
import { UploadedFile } from '../../../types';
import { FileDisplay } from '../FileDisplay';

export interface ToolResultBlockProps extends React.HTMLAttributes<HTMLDivElement> {
    files?: UploadedFile[];
    onImageClick?: (file: UploadedFile) => void;
}

export const ToolResultBlock: React.FC<ToolResultBlockProps> = ({ className, children, files, onImageClick, ...props }) => {
    const [copied, setCopied] = useState(false);

    // Try to find the pre element which contains the code/output
    const preElement = React.Children.toArray(children).find(
        child => React.isValidElement(child) && child.type === 'pre'
    );
    
    // Extract raw text for download
    const rawCode = preElement 
        ? extractTextFromNode(preElement) 
        : extractTextFromNode(children).replace(/^Execution Result.*:/, '').trim();

    const handleDownload = () => {
        if (!rawCode) return;
        
        let extension = 'txt';
        const lines = rawCode.split('\n').filter(l => l.trim());
        
        // Simple CSV detection: Header row with commas + at least one data row with commas
        if (lines.length > 1 && lines[0].includes(',') && lines[1].includes(',')) {
            extension = 'csv';
        }
        // Simple JSON detection
        if (rawCode.trim().startsWith('{') || rawCode.trim().startsWith('[')) {
            extension = 'json';
        }

        const blob = new Blob([rawCode], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `execution-output-${Date.now()}.${extension}`);
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const generatedFiles = files?.filter(f => f.name.startsWith('generated-')) || [];
    const hasDownloadableText = rawCode && rawCode.length >= 5;

    return (
        <div className={`${className} group relative ${hasDownloadableText ? 'pr-8' : ''}`} {...props}>
            {hasDownloadableText && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <button 
                        onClick={handleDownload}
                        className={`${MESSAGE_BLOCK_BUTTON_CLASS} !bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] shadow-sm`}
                        title="Download Output"
                    >
                        {copied ? <Check size={14} className="text-[var(--theme-text-success)] icon-animate-pop"/> : <Download size={14} />}
                    </button>
                </div>
            )}
            {children}
            
            {generatedFiles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--theme-border-secondary)]/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-1.5 mb-2">
                        <FileOutput size={12} /> Generated Output Files
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {generatedFiles.map(file => (
                            <FileDisplay 
                                key={file.id} 
                                file={file} 
                                onFileClick={onImageClick} 
                                isFromMessageList={true} 
                                isGemini3={false} 
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};