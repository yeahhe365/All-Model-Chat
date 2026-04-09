
import React from 'react';
import { translations } from '../../../utils/appUtils';

interface HtmlPreviewContentProps {
    iframeRef: React.RefObject<HTMLIFrameElement>;
    htmlContent: string;
    scale: number;
    t: (key: keyof typeof translations, fallback?: string) => string;
}

export const HtmlPreviewContent: React.FC<HtmlPreviewContentProps> = ({
    iframeRef,
    htmlContent,
    scale,
    t
}) => {
    const handleIframeError = (event: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
        console.error("Iframe loading error:", event);
    };

    return (
        <div className="flex-grow relative overflow-auto custom-scrollbar bg-[var(--theme-bg-tertiary)]">
            {/* Subtle Grid Pattern Background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
                 style={{ 
                     backgroundImage: `radial-gradient(var(--theme-text-tertiary) 1px, transparent 1px)`, 
                     backgroundSize: '20px 20px',
                 }} 
            />
            
            <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title={t('htmlPreview_iframe_title', 'HTML Content Preview')}
                className="border-none bg-white shadow-sm origin-top-left" 
                style={{
                    width: `${100 / scale}%`,
                    height: `${100 / scale}%`,
                    transform: `scale(${scale})`,
                }}
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                onError={handleIframeError}
            />
        </div>
    );
};
