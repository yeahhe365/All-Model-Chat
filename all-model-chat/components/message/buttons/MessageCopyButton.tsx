
import React from 'react';
import { Check, ClipboardCopy } from 'lucide-react';
import { translations } from '../../../utils/appUtils';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

interface MessageCopyButtonProps {
    textToCopy?: string;
    className?: string;
    t: (key: keyof typeof translations) => string;
    iconSize?: number;
}

export const MessageCopyButton: React.FC<MessageCopyButtonProps> = ({ textToCopy, className, t, iconSize = 14 }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  
  const handleCopy = () => {
    if (textToCopy) copyToClipboard(textToCopy);
  };

  return <button onClick={handleCopy} disabled={!textToCopy} className={`${className}`} aria-label={isCopied ? t('copied_button_title') : t('copy_button_title')} title={isCopied ? t('copied_button_title') : t('copy_button_title')}>{isCopied ? <Check size={iconSize} className="text-[var(--theme-text-success)]" strokeWidth={1.5} /> : <ClipboardCopy size={iconSize} strokeWidth={1.5} />}</button>;
};
