import React from 'react';
import { ImageIcon, FileCode2, FileText, FileJson } from 'lucide-react';
import { type ExportType } from '@/hooks/useMessageExport';
import { useResponsiveValue } from '@/hooks/useDevice';
import { useI18n } from '@/contexts/I18nContext';

interface ExportOptionsProps {
  onExport: (type: ExportType) => void;
  variant?: 'message' | 'chat';
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ onExport, variant = 'message' }) => {
  const { t } = useI18n();
  const buttonIconSize = useResponsiveValue(24, 28);

  const descriptions = {
    message: {
      png: t('export_option_message_png_desc'),
      html: t('export_option_message_html_desc'),
      txt: t('export_option_message_txt_desc'),
      json: t('export_option_message_json_desc'),
    },
    chat: {
      png: t('export_option_chat_png_desc'),
      html: t('export_option_chat_html_desc'),
      txt: t('export_option_chat_txt_desc'),
      json: t('export_option_chat_json_desc'),
    },
  };

  const currentDesc = descriptions[variant];

  const options = [
    {
      id: 'png' as const,
      icon: ImageIcon,
      label: t('export_option_png_label'),
      desc: currentDesc.png,
      colorClass: 'text-[var(--theme-text-link)]',
    },
    {
      id: 'html' as const,
      icon: FileCode2,
      label: t('export_option_html_label'),
      desc: currentDesc.html,
      colorClass: 'text-green-500',
    },
    {
      id: 'txt' as const,
      icon: FileText,
      label: t('export_option_txt_label'),
      desc: currentDesc.txt,
      colorClass: 'text-blue-500',
    },
    {
      id: 'json' as const,
      icon: FileJson,
      label: t('export_option_json_label'),
      desc: currentDesc.json,
      colorClass: 'text-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onExport(opt.id)}
          className={`
                        flex flex-col items-center justify-center gap-3 p-6 
                        bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] 
                        rounded-lg border border-[var(--theme-border-secondary)] 
                        transition-all duration-200 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] 
                        transform hover:-translate-y-1 hover:shadow-lg
                    `}
        >
          <opt.icon size={buttonIconSize} className={opt.colorClass} strokeWidth={1.5} />
          <span className="font-semibold text-base text-[var(--theme-text-primary)]">{opt.label}</span>
          <span className="text-xs text-center text-[var(--theme-text-tertiary)]">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
};
