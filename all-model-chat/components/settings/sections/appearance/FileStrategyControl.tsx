
import React from 'react';
import { CloudUpload, Info } from 'lucide-react';
import { translations } from '../../../../utils/appUtils';
import { FilesApiConfig } from '../../../../types';
import { Tooltip } from '../../../shared/Tooltip';
import { ToggleItem } from '../../../shared/ToggleItem';

interface FileStrategyControlProps {
  filesApiConfig: FilesApiConfig;
  setFilesApiConfig: (value: FilesApiConfig) => void;
  t: (key: keyof typeof translations) => string;
}

export const FileStrategyControl: React.FC<FileStrategyControlProps> = ({ filesApiConfig, setFilesApiConfig, t }) => {
  const updateFileConfig = (key: keyof FilesApiConfig, val: boolean) => {
      setFilesApiConfig({ ...filesApiConfig, [key]: val });
  };

  return (
    <div className="bg-[var(--theme-bg-tertiary)]/20 p-3 rounded-xl border border-[var(--theme-border-secondary)]/50">
        <div className="flex items-start justify-between mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] flex items-center gap-2">
                <CloudUpload size={14} strokeWidth={1.5} />
                {t('settings_filesApi_title')}
            </label>
            <Tooltip text={t('settings_filesApi_tooltip')}>
                <Info size={14} className="text-[var(--theme-text-tertiary)] cursor-help" strokeWidth={1.5} />
            </Tooltip>
        </div>
        <p className="text-xs text-[var(--theme-text-secondary)] mb-3 leading-relaxed opacity-80">
            {t('settings_filesApi_desc')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
            <ToggleItem label={t('settings_filesApi_images')} checked={filesApiConfig.images} onChange={(v) => updateFileConfig('images', v)} small />
            <ToggleItem label={t('settings_filesApi_pdfs')} checked={filesApiConfig.pdfs} onChange={(v) => updateFileConfig('pdfs', v)} small />
            <ToggleItem label={t('settings_filesApi_audio')} checked={filesApiConfig.audio} onChange={(v) => updateFileConfig('audio', v)} small />
            <ToggleItem label={t('settings_filesApi_video')} checked={filesApiConfig.video} onChange={(v) => updateFileConfig('video', v)} small />
            <ToggleItem label={t('settings_filesApi_text')} checked={filesApiConfig.text} onChange={(v) => updateFileConfig('text', v)} small />
        </div>
    </div>
  );
};
