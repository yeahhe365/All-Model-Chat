import { describe, expect, it } from 'vitest';
import { LOCAL_PYTHON_SYSTEM_PROMPT } from './promptConstants';

describe('LOCAL_PYTHON_SYSTEM_PROMPT', () => {
  it('forces code-only responses for executable local python turns', () => {
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Return ONLY a single fenced Python code block');
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Do NOT include explanations');
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Do NOT include HTML');
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Do NOT write or simulate "Execution Result"');
  });

  it('requires explicit file output for plots', () => {
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('plt.savefig("chart.png")');
  });
});
