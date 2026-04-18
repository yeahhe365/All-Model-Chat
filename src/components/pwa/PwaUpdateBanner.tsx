import React from 'react';

interface PwaUpdateBannerProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

export const PwaUpdateBanner: React.FC<PwaUpdateBannerProps> = ({
  onRefresh,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-slate-800/20 bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">A newer version of the app is ready.</p>
          <p className="text-xs text-slate-300">Refresh to update the installed shell and latest assets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
