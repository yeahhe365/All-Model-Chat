import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/providerTestUtils';
import type { SavedScenario } from '@/types';
import { ScenarioItem } from './ScenarioItem';

const scenario: SavedScenario = {
  id: 'scenario-1',
  title: '示例场景',
  messages: [
    { id: 'message-1', role: 'user', content: '你好' },
    { id: 'message-2', role: 'model', content: '你好，有什么可以帮你？' },
  ],
};

describe('ScenarioItem', () => {
  it('localizes the message count in Chinese', () => {
    const { container } = renderWithProviders(
      <ScenarioItem scenario={scenario} isSystem={false} onLoad={vi.fn()} onDuplicate={vi.fn()} onExport={vi.fn()} />,
      { language: 'zh' },
    );

    expect(container.textContent).toContain('2 条消息');
    expect(container.textContent).not.toContain('2 msgs');
  });
});
