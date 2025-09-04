import React, { useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';
import { translations } from '../../../utils/appUtils';

interface MessageCopyButtonProps {
    textToCopy?: string;
    className?: string;
    t: (key: keyof typeof translations) => string;
    iconSize?: number;
}

export const MessageCopyButton: React.FC<MessageCopyButtonProps> = ({ textToCopy, className, t, iconSize = 14 }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!textToCopy || copied) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy', err); }
  };
  return <button onClick={handleCopy} disabled={!textToCopy} className={`${className}`} aria-label={copied ? t('copied_button_title') : t('copy_button_title')} title={copied ? t('copied_button_title') : t('copy_button_title')}>{copied ? <Check size={iconSize} className="text-[var(--theme-text-success)]" /> : <ClipboardCopy size={iconSize} />}</button>;
};