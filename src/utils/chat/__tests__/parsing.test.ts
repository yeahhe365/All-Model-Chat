import { describe, it, expect } from 'vitest';
import { parseThoughtProcess } from '../parsing';

describe('parseThoughtProcess', () => {
  it('returns null for undefined input', () => {
    expect(parseThoughtProcess(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseThoughtProcess('')).toBeNull();
  });

  it('returns fallback for whitespace-only string', () => {
    const result = parseThoughtProcess('   \n  ');
    expect(result?.isFallback).toBe(true);
    expect(result?.content).toBe('');
  });

  it('extracts content after ## heading', () => {
    const result = parseThoughtProcess('## Step 1\nFirst thought\n## Step 2\nSecond thought');
    expect(result).toEqual({
      title: 'Step 2',
      content: 'Second thought',
      isFallback: false,
    });
  });

  it('extracts content after ### heading', () => {
    const result = parseThoughtProcess('### Analysis\nDeep analysis here');
    expect(result).toEqual({
      title: 'Analysis',
      content: 'Deep analysis here',
      isFallback: false,
    });
  });

  it('extracts content after **bold** heading', () => {
    const result = parseThoughtProcess('**Reasoning**\nSome reasoning text');
    expect(result).toEqual({
      title: 'Reasoning',
      content: 'Some reasoning text',
      isFallback: false,
    });
  });

  it('extracts content after __underline__ heading', () => {
    const result = parseThoughtProcess('__Planning__\nPlan details');
    expect(result).toEqual({
      title: 'Planning',
      content: 'Plan details',
      isFallback: false,
    });
  });

  it('uses fallback when no heading found', () => {
    const result = parseThoughtProcess('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    expect(result?.isFallback).toBe(true);
    expect(result?.title).toBe('Latest thought');
    // Fallback takes last 5 lines
    expect(result?.content).toContain('Line 1');
  });

  it('returns empty content when heading is the last line', () => {
    const result = parseThoughtProcess('Some text\n## Final Heading');
    expect(result).toEqual({
      title: 'Final Heading',
      content: '',
      isFallback: false,
    });
  });

  it('uses the LAST heading when multiple headings exist', () => {
    const result = parseThoughtProcess('## First\nContent A\n## Second\nContent B\n## Third\nContent C');
    expect(result?.title).toBe('Third');
    expect(result?.content).toBe('Content C');
  });

  it('handles bold heading with internal ** correctly (not treated as heading)', () => {
    // A line like "**bold **inner** text**" has internal ** so it should NOT match
    const result = parseThoughtProcess('**bold **inner** text**\nSome content');
    // Falls back because the bold check fails due to internal **
    expect(result?.isFallback).toBe(true);
  });

  it('trims whitespace from content lines', () => {
    const result = parseThoughtProcess('## Title\n  \n  Content line  \n  \n');
    expect(result?.content).toBe('Content line');
  });
});
