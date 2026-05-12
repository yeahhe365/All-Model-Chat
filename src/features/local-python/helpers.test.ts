import { describe, expect, it } from 'vitest';
import type { ChatMessage, UploadedFile } from '@/types';
import { collectLocalPythonInputFiles } from './helpers';

const makeFile = (id: string, name: string): UploadedFile => ({
  id,
  name,
  type: 'text/csv',
  size: 16,
  rawFile: new File(['a,b\n1,2\n'], name, { type: 'text/csv' }),
  uploadState: 'active',
});

const makeMessage = (id: string, role: 'user' | 'model', content: string, files?: UploadedFile[]): ChatMessage => ({
  id,
  role,
  content,
  files,
  timestamp: new Date(),
});

describe('local-python helpers', () => {
  it('collects only active user-provided files before the target model message', () => {
    const inputA = makeFile('input-a', 'dataset-a.csv');
    const inputB = makeFile('input-b', 'dataset-b.csv');
    const generated = makeFile('generated-a', 'generated-plot.csv');

    const files = collectLocalPythonInputFiles(
      [
        makeMessage('user-1', 'user', 'analyze this', [inputA]),
        makeMessage('model-1', 'model', '```python\nprint(1)\n```', [generated]),
        makeMessage('user-2', 'user', 'also use this', [inputB]),
        makeMessage('model-2', 'model', '```python\nprint(2)\n```'),
      ],
      'model-2',
    );

    expect(files.map((file) => file.id)).toEqual(['input-a', 'input-b']);
  });
});
