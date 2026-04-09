import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getTranslator } from '../../utils/appUtils';
import { useSettingsStore } from '../../stores/settingsStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    const language = useSettingsStore.getState().language || (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');
    const t = getTranslator(language);

    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-gray-900 p-8">
          <div className="max-w-md rounded-xl bg-gray-800 p-8 text-center shadow-2xl">
            <div className="mb-4 text-5xl">&#9888;&#65039;</div>
            <h2 className="mb-2 text-xl font-bold text-white">{t('errorBoundary_title')}</h2>
            <p className="mb-4 text-sm text-gray-400">
              {this.state.error?.message || t('errorBoundary_fallback')}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              {t('errorBoundary_reload')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
