import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { createChatMessage } from '@/test/factories';
import { MessageFooter } from './MessageFooter';

describe('MessageFooter', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('sends a follow-up when the suggestion itself is clicked', () => {
    const onSuggestionClick = vi.fn();
    const onSuggestionFill = vi.fn();

    renderer.render(
      <MessageFooter
        message={createChatMessage({
          role: 'model',
          suggestions: ['Show a concrete example'],
        })}
        onSuggestionClick={onSuggestionClick}
        onSuggestionFill={onSuggestionFill}
      />,
    );

    const suggestionButton = Array.from(renderer.container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Show a concrete example',
    );

    act(() => {
      suggestionButton?.click();
    });

    expect(onSuggestionClick).toHaveBeenCalledWith('Show a concrete example');
    expect(onSuggestionFill).not.toHaveBeenCalled();
  });

  it('shows a hover-revealed fill button above each suggestion that only fills the input', () => {
    const onSuggestionClick = vi.fn();
    const onSuggestionFill = vi.fn();

    renderer.render(
      <MessageFooter
        message={createChatMessage({
          role: 'model',
          suggestions: ['Compare both options'],
        })}
        onSuggestionClick={onSuggestionClick}
        onSuggestionFill={onSuggestionFill}
      />,
    );

    const fillButton = renderer.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Fill suggestion into input"]',
    );

    expect(fillButton).not.toBeNull();
    expect(fillButton?.className).toContain('group-hover/suggestion:opacity-100');

    act(() => {
      fillButton?.click();
    });

    expect(onSuggestionFill).toHaveBeenCalledWith('Compare both options');
    expect(onSuggestionClick).not.toHaveBeenCalled();
  });
});
