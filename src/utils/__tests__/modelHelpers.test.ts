import { describe, it, expect } from 'vitest';
import {
  sortModels,
  isGemini3Model,
  calculateTokenStats,
  adjustThinkingBudget,
} from '../modelHelpers';
import { ModelOption } from '../../types';

describe('sortModels', () => {
  it('sorts pinned models before unpinned', () => {
    const models: ModelOption[] = [
      { id: 'model-b', name: 'B' },
      { id: 'model-a', name: 'A', isPinned: true },
    ];
    const result = sortModels(models);
    expect(result[0].id).toBe('model-a');
  });

  it('sorts by name when both are unpinned', () => {
    const models: ModelOption[] = [
      { id: 'z-model', name: 'Z Model' },
      { id: 'a-model', name: 'A Model' },
    ];
    const result = sortModels(models);
    expect(result[0].name).toBe('A Model');
  });

  it('sorts pinned by category weight: standard < native-audio < image < imagen < tts', () => {
    const models: ModelOption[] = [
      { id: 'gemini-tts', name: 'TTS', isPinned: true },
      { id: 'gemini-imagen', name: 'Imagen', isPinned: true },
      { id: 'gemini-flash', name: 'Flash', isPinned: true },
      { id: 'gemini-image', name: 'Image', isPinned: true },
      { id: 'gemini-native-audio', name: 'Audio', isPinned: true },
    ];
    const result = sortModels(models);
    expect(result.map(m => m.id)).toEqual([
      'gemini-flash',
      'gemini-native-audio',
      'gemini-image',
      'gemini-imagen',
      'gemini-tts',
    ]);
  });

  it('prioritizes gemini-3 among pinned models of same category', () => {
    const models: ModelOption[] = [
      { id: 'gemini-2.5-pro', name: '2.5 Pro', isPinned: true },
      { id: 'gemini-3-flash', name: '3 Flash', isPinned: true },
    ];
    const result = sortModels(models);
    expect(result[0].id).toBe('gemini-3-flash');
  });

  it('does not mutate original array', () => {
    const models: ModelOption[] = [
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' },
    ];
    sortModels(models);
    expect(models[0].id).toBe('b');
  });
});

describe('isGemini3Model', () => {
  it('returns false for empty string', () => {
    expect(isGemini3Model('')).toBe(false);
  });

  it('returns true for gemini-3-flash-preview', () => {
    expect(isGemini3Model('gemini-3-flash-preview')).toBe(true);
  });

  it('returns true for gemini-3-pro', () => {
    expect(isGemini3Model('gemini-3-pro-image-preview')).toBe(true);
  });

  it('returns true for gemini-3.1-flash', () => {
    expect(isGemini3Model('gemini-3.1-flash-lite-preview')).toBe(true);
  });

  it('returns true for models/ prefixed IDs', () => {
    expect(isGemini3Model('models/gemini-3-flash-preview')).toBe(true);
  });

  it('returns false for gemini-2.5-pro', () => {
    expect(isGemini3Model('gemini-2.5-pro')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isGemini3Model('Gemini-3-Flash-Preview')).toBe(true);
  });
});

describe('calculateTokenStats', () => {
  it('returns zeros for undefined metadata', () => {
    expect(calculateTokenStats(undefined)).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      thoughtTokens: 0,
    });
  });

  it('extracts token counts from metadata', () => {
    const result = calculateTokenStats({
      totalTokenCount: 100,
      promptTokenCount: 30,
      candidatesTokenCount: 70,
    } as any);
    expect(result).toEqual({
      promptTokens: 30,
      completionTokens: 70,
      totalTokens: 100,
      thoughtTokens: 0,
    });
  });

  it('calculates completionTokens as total - prompt when candidatesTokenCount is missing', () => {
    const result = calculateTokenStats({
      totalTokenCount: 100,
      promptTokenCount: 40,
    } as any);
    expect(result.completionTokens).toBe(60);
  });

  it('extracts thought tokens', () => {
    const result = calculateTokenStats({
      totalTokenCount: 200,
      promptTokenCount: 50,
      candidatesTokenCount: 150,
      thoughtsTokenCount: 40,
    } as any);
    expect(result.thoughtTokens).toBe(40);
  });
});

describe('adjustThinkingBudget', () => {
  it('clamps to max when budget exceeds range', () => {
    expect(adjustThinkingBudget('gemini-2.5-pro', 50000)).toBe(32768);
  });

  it('clamps to min when budget is below range', () => {
    expect(adjustThinkingBudget('gemini-2.5-pro', 10)).toBe(128);
  });

  it('returns budget unchanged for unknown models', () => {
    expect(adjustThinkingBudget('unknown-model', 5000)).toBe(5000);
  });

  it('converts auto (-1) to max for non-Gemini-3 models', () => {
    expect(adjustThinkingBudget('gemini-2.5-pro', -1)).toBe(32768);
  });

  it('keeps auto (-1) for Gemini 3 models', () => {
    expect(adjustThinkingBudget('gemini-3-flash-preview', -1)).toBe(-1);
  });

  it('forces mandatory thinking models with 0 budget to max (non-G3)', () => {
    // gemini-2.5-pro is mandatory thinking, not G3
    expect(adjustThinkingBudget('gemini-2.5-pro', 0)).toBe(32768);
  });

  it('forces mandatory thinking models with 0 budget to -1 (G3)', () => {
    // gemini-3-flash-preview is G3 and mandatory
    expect(adjustThinkingBudget('gemini-3-flash-preview', 0)).toBe(-1);
  });

  it('keeps valid budget within range', () => {
    expect(adjustThinkingBudget('gemini-2.5-pro', 1000)).toBe(1000);
  });
});
