import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { setupTestRenderer } from '@/test/testUtils';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommand } from '@/types/slashCommands';

const createCommands = (): SlashCommand[] =>
  Array.from({ length: 8 }, (_, index) => ({
    name: `command-${index}`,
    description: `Command ${index}`,
    icon: 'Sparkles',
    action: () => {},
  }));

describe('SlashCommandMenu', () => {
  const renderer = setupTestRenderer();

  it('keeps clipping on the frame and scrolling on a dedicated inner container', () => {
    act(() => {
      renderer.root.render(
        <SlashCommandMenu isOpen={true} commands={createCommands()} onSelect={() => {}} selectedIndex={4} />,
      );
    });

    const frame = renderer.container.querySelector('[data-slash-command-frame="true"]');
    const scrollContainer = renderer.container.querySelector('[data-slash-command-scroll="true"]');

    expect(frame).not.toBeNull();
    expect(scrollContainer).not.toBeNull();
    expect(frame?.className.toString()).toContain('overflow-hidden');
    expect(scrollContainer?.className.toString()).toContain('overflow-y-auto');
    expect(scrollContainer?.className.toString()).not.toContain('overflow-hidden');
  });
});
