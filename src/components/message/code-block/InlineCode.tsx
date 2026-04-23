
import React from 'react';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

type InlineCodeProps = React.ComponentPropsWithoutRef<'code'> & {
    children?: React.ReactNode;
    inline?: boolean;
};

export const InlineCode = ({ className, children, inline: _inline, ...props }: InlineCodeProps) => {
    const { isCopied, copyToClipboard } = useCopyToClipboard(1500);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = String(children).trim();
        if (!text) return;
        copyToClipboard(text);
    };

    return (
        <code
            className={`${className || ''} relative inline-block cursor-pointer group/code`}
            onClick={handleCopy}
            title="Click to copy"
            {...props}
        >
            {children}
            {isCopied && (
                <span className="absolute bottom-full left-0 mb-1 bg-black/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                    Copied!
                </span>
            )}
        </code>
    );
};
