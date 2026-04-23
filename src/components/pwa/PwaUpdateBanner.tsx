import React from 'react';
import { useI18n } from '../../contexts/I18nContext';

interface PwaUpdateBannerProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

export const PwaUpdateBanner: React.FC<PwaUpdateBannerProps> = ({
  onRefresh,
  onDismiss,
}) => {
  const { t } = useI18n();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-slate-800/35 bg-slate-950 px-4 py-3 text-white shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t('about_update_ready')}</p>
          <p className="text-xs text-slate-300">{t('pwaUpdate_refresh_prompt')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
          >
            {t('pwaUpdate_later')}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {t('refresh')}
          </button>
        </div>
      </div>
    </div>
  );
};
