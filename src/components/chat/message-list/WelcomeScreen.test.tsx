import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WelcomeScreen } from './WelcomeScreen';
import { translations } from '../../../utils/translations';

const t = (key: keyof typeof translations, fallback?: string) => {
  if (key === 'welcome_greeting') {
    return 'How can I help you today?';
  }
  return fallback ?? key;
};

const advanceTypewriter = async (characterCount: number) => {
  for (let index = 0; index < characterCount; index += 1) {
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
  }
};

const setHoverCapablePointer = (matches: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query === '(hover: hover) and (pointer: fine)' ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
};

describe('WelcomeScreen', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
    container.remove();
    document.body.innerHTML = '';
  });

  it('exposes the welcome greeting as an accessible button', async () => {
    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector('button');

    expect(trigger).not.toBeNull();
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-live', 'polite');
    expect(trigger).toHaveTextContent('How can I help you today?');
  });

  it('keeps the default cursor so the desktop hover trigger feels hidden', async () => {
    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector('button');

    expect(trigger?.className).not.toContain('cursor-pointer');
  });

  it('switches to one easter egg quote when the mobile welcome greeting is clicked', async () => {
    setHoverCapablePointer(false);

    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.click();
    });
    await advanceTypewriter('Cogito, ergo sum.'.length);

    expect(trigger).toHaveTextContent('Cogito, ergo sum.');
    expect(trigger).not.toHaveTextContent('How can I help you today?');
  });

  it('types the easter egg quote after clicking the mobile welcome greeting', async () => {
    setHoverCapablePointer(false);

    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.click();
    });

    expect(trigger).not.toHaveTextContent('Cogito, ergo sum.');

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(trigger).toHaveTextContent('C');
    expect(trigger).not.toHaveTextContent('Cogito, ergo sum.');

    await advanceTypewriter('Cogito, ergo sum.'.length - 1);

    expect(trigger).toHaveTextContent('Cogito, ergo sum.');
  });

  it('triggers the desktop easter egg only after hovering for three seconds', async () => {
    setHoverCapablePointer(true);

    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.click();
    });

    expect(trigger).toHaveTextContent('How can I help you today?');

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(2999);
    });

    expect(trigger).toHaveTextContent('How can I help you today?');

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(trigger).not.toHaveTextContent('Cogito, ergo sum.');

    await advanceTypewriter('Cogito, ergo sum.'.length);

    expect(trigger).toHaveTextContent('Cogito, ergo sum.');
  });

  it('cancels the desktop easter egg when hover ends before three seconds', async () => {
    setHoverCapablePointer(true);

    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(2000);
      trigger?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      vi.advanceTimersByTime(1000);
    });

    expect(trigger).toHaveTextContent('How can I help you today?');
  });

  it('restores the welcome greeting when leaving after the desktop easter egg appears', async () => {
    setHoverCapablePointer(true);

    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(3000);
    });
    await advanceTypewriter('Cogito, ergo sum.'.length);

    expect(trigger).toHaveTextContent('Cogito, ergo sum.');

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    expect(trigger).toHaveTextContent('How can I help you today?');
  });

  it('restores the welcome greeting when leaving while the desktop easter egg is typing', async () => {
    setHoverCapablePointer(true);

    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(3000);
    });
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(trigger).toHaveTextContent('C');

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    expect(trigger).toHaveTextContent('How can I help you today?');
  });

  it('supports keyboard activation for the easter egg', async () => {
    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    const trigger = container.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await advanceTypewriter('Cogito, ergo sum.'.length);

    expect(trigger).toHaveTextContent('Cogito, ergo sum.');
  });

  it('updates the displayed greeting when the translated welcome text changes', async () => {
    await act(async () => {
      root.render(<WelcomeScreen t={t} />);
    });

    expect(container.querySelector('button')).toHaveTextContent('How can I help you today?');

    await act(async () => {
      root.render(<WelcomeScreen t={() => '有什么可以帮忙的？'} />);
    });

    expect(container.querySelector('button')).toHaveTextContent('有什么可以帮忙的？');
  });
});
