import { describe, expect, it } from 'vitest';
import { LOCAL_PYTHON_SYSTEM_PROMPT } from './promptConstants';

describe('LOCAL_PYTHON_SYSTEM_PROMPT', () => {
  it('instructs the model to use the local python tool instead of returning raw code blocks', () => {
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Call the `run_local_python` tool');
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Do not return fenced Python code blocks');
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('After receiving the tool response');
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('Do NOT write or simulate "Execution Result"');
  });

  it('requires explicit file output for plots', () => {
    expect(LOCAL_PYTHON_SYSTEM_PROMPT).toContain('plt.savefig("chart.png")');
  });
});
