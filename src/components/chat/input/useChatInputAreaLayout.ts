interface UseChatInputAreaLayoutParams {
  isFullscreen: boolean;
  isPipActive?: boolean;
  isAnimatingSend: boolean;
  isRecording: boolean;
  inputDisabled: boolean;
}

export const useChatInputAreaLayout = ({
  isFullscreen,
  isPipActive,
  isAnimatingSend,
  isRecording,
  inputDisabled,
}: UseChatInputAreaLayoutParams) => {
  const isUIBlocked = inputDisabled && !isAnimatingSend && !isRecording;

  const wrapperClass = isFullscreen
    ? 'fixed inset-0 z-[2000] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] p-4 sm:p-6 flex flex-col fullscreen-enter-animation'
    : `bg-transparent ${isUIBlocked ? 'opacity-30 pointer-events-none' : ''}`;

  const innerContainerClass = isFullscreen
    ? 'w-full max-w-6xl mx-auto flex flex-col h-full'
    : `mx-auto w-full ${!isPipActive ? 'max-w-[44.8rem]' : ''} px-2 sm:px-3 pt-0 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]`;

  const formClass = isFullscreen
    ? 'flex-grow flex flex-col relative min-h-0'
    : `relative ${isAnimatingSend ? 'form-send-animate' : ''}`;

  const inputContainerClass = isFullscreen
    ? 'flex flex-col gap-2 rounded-none sm:rounded-[26px] border-0 sm:border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-4 py-4 pb-[calc(3.5rem+0.72rem)] shadow-none h-full transition-all duration-200 relative'
    : 'flex flex-col gap-2 rounded-[26px] border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-input)] px-3 py-[0.486rem] pb-[calc(3.15rem+0.486rem)] sm:px-4 sm:py-[0.648rem] sm:pb-[calc(3.15rem+0.648rem)] shadow-lg transition-all duration-300 focus-within:border-[var(--theme-border-focus)] relative z-20';

  const queuedSubmissionContainerClass = isFullscreen
    ? 'mb-2 flex-shrink-0'
    : 'relative z-10 mx-5 mb-[-22px] -translate-y-1.5';
  const actionsContainerClass =
    'absolute bottom-[0.486rem] left-3 right-3 sm:bottom-[0.648rem] sm:left-4 sm:right-4 flex items-center justify-between z-10';

  return {
    isUIBlocked,
    wrapperClass,
    innerContainerClass,
    formClass,
    inputContainerClass,
    queuedSubmissionContainerClass,
    actionsContainerClass,
  };
};
