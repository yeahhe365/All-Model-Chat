import React from 'react';
import { ChatMessage, UploadedFile, AppSettings, SideViewContent } from '../../types';
import { translations } from '../../utils/appUtils';
import { MessageFiles } from './content/MessageFiles';
import { MessageThoughts } from './content/MessageThoughts';
import { MessageText } from './content/MessageText';
import { MessageFooter } from './content/MessageFooter';

interface MessageContentProps {
    message: ChatMessage;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    baseFontSize: number;
    expandCodeBlocksByDefault: boolean;
    isMermaidRenderingEnabled: boolean;
    isGraphvizRenderingEnabled: boolean;
    onSuggestionClick?: (suggestion: string) => void;
    t: (key: keyof typeof translations) => string;
    appSettings: AppSettings;
    themeId: string;
    onOpenSidePanel: (content: SideViewContent) => void;
    onConfigureFile?: (file: UploadedFile, messageId: string) => void;
    isGemini3?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = React.memo((props) => {
    const { 
        message, 
        onImageClick, 
        onConfigureFile, 
        isGemini3 
    } = props;

    const hasFiles = message.files && message.files.length > 0;
    const hasContentOrAudio = !!(message.content || message.audioSrc);

    return (
        <>
            <MessageFiles 
                files={message.files || []} 
                onImageClick={onImageClick} 
                onConfigureFile={onConfigureFile} 
                messageId={message.id} 
                isGemini3={isGemini3} 
                hasContentOrAudio={hasContentOrAudio}
            />
            
            <MessageThoughts {...props} />

            <MessageText {...props} />
            
            <MessageFooter 
                message={message} 
                t={props.t} 
                onSuggestionClick={props.onSuggestionClick} 
            />
        </>
    );
});