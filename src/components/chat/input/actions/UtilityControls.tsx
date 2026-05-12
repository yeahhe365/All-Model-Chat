import React from 'react';
import { CHAT_INPUT_BUTTON_CLASS } from '@/constants/appConstants';
import type { ComposerAuxiliaryAction } from './useComposerAuxiliaryActions';

export const UtilityControls: React.FC<{ actions: ComposerAuxiliaryAction[] }> = ({ actions }) => {
  return (
    <>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.action();
          }}
          disabled={action.disabled}
          className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)]`}
          aria-label={action.ariaLabel}
          title={action.title}
          data-testid={action.testId}
        >
          {action.icon}
        </button>
      ))}
    </>
  );
};
