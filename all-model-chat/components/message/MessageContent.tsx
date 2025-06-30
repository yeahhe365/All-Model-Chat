import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Loader2, ChevronDown, ChevronUp, Sigma } from 'lucide-react';

import { ChatMessage, UploadedFile, ThemeColors } from '../../types';
import { FileDisplay } from './FileDisplay';
import { CodeBlock } from './CodeBlock';
import { translations } from '../../utils/appUtils';

const renderThoughtsMarkdown = (content: string) => {
  const rawMarkup = marked.parse(content || ''); 
  const cleanMarkup = DOMPurify.sanitize(rawMarkup as string);
  return { __html: cleanMarkup };
};

const MessageTimer: React.FC<{ startTime?: Date; endTime?: Date; isLoading?: boolean }> = ({ startTime, endTime, isLoading }) => {
  const [elapsedTime, setElapsedTime] = useState<string>('');
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isLoading && startTime instanceof Date) {
      const updateTimer = () => setElapsedTime(`${((new Date().getTime() - startTime.getTime()) / 1000).toFixed(1)}s`);
      updateTimer();
      intervalId = setInterval(updateTimer, 200);
    } else if (!isLoading && startTime instanceof Date && endTime instanceof Date) {
      setElapsedTime(`${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1)}s`);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [startTime, endTime, isLoading]);

  if (!elapsedTime && !(isLoading && startTime)) return null;
  return <span className="text-xs text-[var(--theme-text-tertiary)] font-light tabular-nums pt-0.5 flex items-center">{isLoading && startTime && <Loader2 size={10} className="animate-spin mr-1" />} {elapsedTime || "0.0s"}</span>;
};

const TokenDisplay: React.FC<{ message: ChatMessage; t: (key: keyof typeof translations) => string }> = ({ message, t }) => {
  if (message.role !== 'model' || (!message.promptTokens && !message.completionTokens && !message.cumulativeTotalTokens)) return null;
  const parts = [
    typeof message.promptTokens === 'number' && `Input: ${message.promptTokens}`,
    typeof message.completionTokens === 'number' && `Output: ${message.completionTokens}`,
    typeof message.cumulativeTotalTokens === 'number' && `Total: ${message.cumulativeTotalTokens}`,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <span className="text-xs text-[var(--theme-text-tertiary)] font-light tabular-nums pt-0.5 flex items-center" title="Token Usage"><Sigma size={10} className="mr-1.5 opacity-80" />{parts.join(' | ')}<span className="ml-1">{t('tokens_unit')}</span></span>;
};

interface MessageContentProps {
    message: ChatMessage;
    onImageClick: (file: UploadedFile) => void;
    onOpenHtmlPreview: (html: string, options?: { initialTrueFullscreen?: boolean }) => void;
    showThoughts: boolean;
    baseFontSize: number; 
    t: (key: keyof typeof translations) => string;
}

export const MessageContent: React.FC<MessageContentProps> = React.memo(({ message, onImageClick, onOpenHtmlPreview, showThoughts, baseFontSize, t }) => {
    const { content, files, isLoading, thoughts, generationStartTime, generationEndTime, audioSrc } = message;
    const [isThoughtsExpanded, setThoughtsExpanded] = useState(false);
    
    const showPrimaryThinkingIndicator = isLoading && !content && !audioSrc && (!showThoughts || !thoughts);
    const areThoughtsVisible = message.role === 'model' && thoughts && showThoughts;

    const codeBlockCounter = useRef(0);
    useEffect(() => {
      codeBlockCounter.current = 0; // Reset on each render of message content
    });

    const components = useMemo(() => ({
      pre: (props: any) => {
        // rehype-highlight wraps the `pre` with a div sometimes, we need to handle that by passing children
        const { node, ...rest } = props;
        const children = (props.children[0] && props.children[0].type === 'code') ? props.children[0] : props.children;
        return <CodeBlock {...rest} onOpenHtmlPreview={onOpenHtmlPreview}>{children}</CodeBlock>;
      }
    }), [onOpenHtmlPreview]);

    return (
        <>
            {files && files.length > 0 && (
                <div className={`space-y-2 ${content || audioSrc ? 'mb-1.5 sm:mb-2' : ''}`}>
                    {files.map((file) => <FileDisplay key={file.id} file={file} onImageClick={onImageClick} isFromMessageList={true} />)}
                </div>
            )}
            
            {areThoughtsVisible && (
                <div className="mb-1.5 p-1.5 sm:p-2 bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(0,0,0,0.2)] rounded-md border border-[var(--theme-border-secondary)]">
                    <button onClick={() => setThoughtsExpanded(p => !p)} className="flex items-center justify-between w-full text-xs font-semibold text-[var(--theme-icon-thought)] mb-1 hover:text-[var(--theme-text-link)]" aria-expanded={isThoughtsExpanded}>
                        <span className="flex items-center">{isLoading && <Loader2 size={12} className="animate-spin mr-1.5" />}{t('thinking_text')}</span>
                        {isThoughtsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isThoughtsExpanded && <div className="text-xs text-[var(--theme-text-secondary)] markdown-body" dangerouslySetInnerHTML={renderThoughtsMarkdown(thoughts)} />}
                </div>
            )}

            {showPrimaryThinkingIndicator && (
                <div className="flex items-center text-sm text-[var(--theme-bg-model-message-text)] py-0.5">
                    <Loader2 size={16} className="animate-spin mr-2 text-[var(--theme-bg-accent)]" /> {t('thinking_text')}
                </div>
            )}

            {content && (
                <div className="markdown-body" style={{ fontSize: `${baseFontSize}px` }}> 
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]} components={components}>
                        {content}
                    </ReactMarkdown>
                </div>
            )}
            
            {audioSrc && (
                <div className="mt-2">
                    <audio src={audioSrc} controls autoPlay className="w-full h-10" />
                </div>
            )}
            
            {(message.role === 'model' || (message.role === 'error' && generationStartTime)) && (
                <div className="mt-1 sm:mt-1.5 flex justify-end items-center gap-2 sm:gap-3">
                    <TokenDisplay message={message} t={t} />
                    {(isLoading || (generationStartTime && generationEndTime)) && <MessageTimer startTime={generationStartTime} endTime={generationEndTime} isLoading={isLoading} />}
                </div>
            )}
        </>
    );
});
