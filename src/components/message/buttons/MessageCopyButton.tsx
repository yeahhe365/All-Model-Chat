import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Check, ClipboardCopy } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface MessageCopyButtonProps {
  textToCopy?: string;
  className?: string;
  iconSize?: number;
}

export const MessageCopyButton: React.FC<MessageCopyButtonProps> = ({ textToCopy, className, iconSize = 14 }) => {
  const { t } = useI18n();
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = () => {
    if (textToCopy) copyToClipboard(textToCopy);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!textToCopy}
      className={`${className}`}
      aria-label={isCopied ? t('copied_button_title') : t('copy_button_title')}
      title={isCopied ? t('copied_button_title') : t('copy_button_title')}
    >
      {isCopied ? (
        <Check size={iconSize} className="text-[var(--theme-text-success)] icon-animate-pop" strokeWidth={1.5} />
      ) : (
        <ClipboardCopy size={iconSize} strokeWidth={1.5} />
      )}
    </button>
  );
};
