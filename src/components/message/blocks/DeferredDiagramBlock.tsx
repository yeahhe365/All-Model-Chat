import { logService } from '@/services/logService';
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeferredDiagramBlockProps<TProps extends object> {
  load: () => Promise<{ default: React.ComponentType<TProps> }>;
  componentProps: TProps;
  label: string;
  eager?: boolean;
}

export const DeferredDiagramBlock = <TProps extends object>({
  load,
  componentProps,
  label,
  eager = false,
}: DeferredDiagramBlockProps<TProps>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [Component, setComponent] = useState<React.ComponentType<TProps> | null>(null);
  const [loadRequested, setLoadRequested] = useState(eager);
  const isLoading = eager || loadRequested;

  useEffect(() => {
    if (eager || Component || isLoading) {
      return;
    }

    const target = containerRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setLoadRequested(true);
        observer.disconnect();
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [Component, eager, isLoading]);

  useEffect(() => {
    if (!isLoading || Component) {
      return;
    }

    let isCancelled = false;

    void load()
      .then((module) => {
        if (isCancelled) {
          return;
        }

        setComponent(() => module.default);
      })
      .catch((error) => {
        logService.error(`Failed to load ${label}`, error);
        if (!isCancelled && !eager) {
          setLoadRequested(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [Component, eager, isLoading, label, load]);

  const handleLoad = () => {
    setLoadRequested(true);
  };

  if (Component) {
    return React.createElement(Component, componentProps);
  }

  return (
    <div className="my-3" data-export-pending={isLoading ? 'true' : undefined}>
      <div
        ref={containerRef}
        className="flex min-h-[140px] items-center justify-center rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-tertiary)]/20 p-4"
        aria-busy={isLoading}
      >
        <button
          type="button"
          onClick={handleLoad}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-3 py-1.5 text-xs font-medium text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-bg-secondary)] disabled:cursor-wait disabled:opacity-80"
          aria-label={label}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>{label}</span>
        </button>
      </div>
    </div>
  );
};
