import { describe, expect, it } from 'vitest';
import {
  formatLiveArtifactFollowupPrompt,
  mergeLiveArtifactFollowupState,
  normalizeLiveArtifactFollowupPayload,
} from './liveArtifactFollowup';

describe('liveArtifactFollowup utilities', () => {
  it('formats a structured Live Artifact follow-up as a chat prompt', () => {
    const prompt = formatLiveArtifactFollowupPrompt(
      {
        instruction: '基于当前选择继续生成实施计划',
        title: '方案选择器',
        state: { selected: '方案B', priority: '低风险优先' },
      },
      'zh',
    );

    expect(prompt).toContain('请根据 Live Artifact 中的交互选择继续处理。');
    expect(prompt).toContain('指令：\n基于当前选择继续生成实施计划');
    expect(prompt).toContain('Artifact 标题：\n方案选择器');
    expect(prompt).toContain('"selected": "方案B"');
    expect(prompt).toContain('"priority": "低风险优先"');
  });

  it('rejects invalid or oversized Live Artifact follow-up payloads', () => {
    expect(normalizeLiveArtifactFollowupPayload({ state: { selected: '方案B' } })).toBeNull();
    expect(normalizeLiveArtifactFollowupPayload({ instruction: '   ' })).toBeNull();
    expect(normalizeLiveArtifactFollowupPayload({ instruction: 'x'.repeat(2001) })).toBeNull();
    expect(
      normalizeLiveArtifactFollowupPayload({
        instruction: 'Continue',
        state: { value: 'x'.repeat(6001) },
      }),
    ).toBeNull();
  });

  it('merges dynamically collected artifact state into a static follow-up payload', () => {
    expect(
      mergeLiveArtifactFollowupState(
        {
          instruction: '继续生成实施计划',
          state: { selected: '方案A', note: 'static' },
        },
        {
          selected: '方案B',
          priority: '低风险优先',
        },
      ),
    ).toEqual({
      instruction: '继续生成实施计划',
      state: {
        selected: '方案B',
        note: 'static',
        priority: '低风险优先',
      },
    });
  });
});
