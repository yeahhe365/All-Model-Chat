import { act } from 'react';
import { setupProviderTestRenderer } from '@/test/providerTestUtils';
import { describe, expect, it, vi } from 'vitest';
import { PiPPlaceholder } from './PiPPlaceholder';

describe('PiPPlaceholder', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'zh' } });

  it('uses localized copy for the picture-in-picture placeholder', () => {
    act(() => {
      renderer.render(<PiPPlaceholder onClosePip={vi.fn()} />);
    });

    expect(renderer.container.textContent).toContain('聊天已在画中画窗口打开');
    expect(renderer.container.textContent).toContain('关闭该窗口可回到这里继续对话。');
    expect(renderer.container.querySelector('button')?.textContent).toBe('关闭画中画窗口');
  });
});
