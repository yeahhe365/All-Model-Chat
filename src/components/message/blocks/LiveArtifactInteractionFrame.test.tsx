import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setupTestRenderer } from '@/test/testUtils';
import { LiveArtifactInteractionFrame } from './LiveArtifactInteractionFrame';
import type { LiveArtifactInteractionSpec } from '../../../utils/liveArtifactInteraction';

describe('LiveArtifactInteractionFrame', () => {
  const renderer = setupTestRenderer();

  it('resets form state when the interaction spec changes in place', () => {
    const handleFollowUp = vi.fn();
    const firstSpec = {
      version: 1,
      title: 'First form',
      instruction: 'Continue from first form.',
      schema: {
        type: 'object',
        properties: {
          topic: { type: 'string', title: 'Topic', default: 'Initial topic' },
        },
      },
    } satisfies LiveArtifactInteractionSpec;
    const secondSpec = {
      version: 1,
      title: 'Second form',
      instruction: 'Continue from second form.',
      schema: {
        type: 'object',
        properties: {
          audience: { type: 'string', title: 'Audience', default: 'Review team' },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={firstSpec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.change(renderer.container.querySelector<HTMLInputElement>('input[name="topic"]')!, {
      target: { value: 'Changed topic' },
    });

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={secondSpec} onFollowUp={handleFollowUp} />);
    });

    expect(renderer.container.querySelector('input[name="topic"]')).toBeNull();
    expect(renderer.container.querySelector<HTMLInputElement>('input[name="audience"]')?.value).toBe('Review team');

    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).toHaveBeenCalledWith({
      instruction: 'Continue from second form.',
      title: 'Second form',
      source: 'amc-live-artifact-interaction:v1',
      state: { audience: 'Review team' },
    });
  });

  it('rejects non-integer submissions instead of truncating them', () => {
    const handleFollowUp = vi.fn();
    const spec = {
      version: 1,
      instruction: 'Continue with this count.',
      schema: {
        type: 'object',
        properties: {
          count: { type: 'integer', title: 'Count' },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={spec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.change(renderer.container.querySelector<HTMLInputElement>('input[name="count"]')!, {
      target: { value: '1.5' },
    });
    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('Enter a whole number.');
  });

  it('rejects numeric submissions outside schema bounds', () => {
    const handleFollowUp = vi.fn();
    const spec = {
      version: 1,
      instruction: 'Continue with this score.',
      schema: {
        type: 'object',
        properties: {
          score: { type: 'number', title: 'Score', minimum: 0, maximum: 1 },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={spec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.change(renderer.container.querySelector<HTMLInputElement>('input[name="score"]')!, {
      target: { value: '1.5' },
    });
    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('Enter a value within the allowed range.');
  });

  it('rejects whitespace-only required string submissions', () => {
    const handleFollowUp = vi.fn();
    const spec = {
      version: 1,
      instruction: 'Continue with this topic.',
      schema: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string', title: 'Topic' },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={spec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.change(renderer.container.querySelector<HTMLInputElement>('input[name="topic"]')!, {
      target: { value: '   ' },
    });
    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('This field is required.');
  });

  it('trims submitted string values before sending the follow-up payload', () => {
    const handleFollowUp = vi.fn();
    const spec = {
      version: 1,
      instruction: 'Continue with this topic.',
      schema: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string', title: 'Topic' },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={spec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.change(renderer.container.querySelector<HTMLInputElement>('input[name="topic"]')!, {
      target: { value: '  Research plan  ' },
    });
    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).toHaveBeenCalledWith({
      instruction: 'Continue with this topic.',
      source: 'amc-live-artifact-interaction:v1',
      state: { topic: 'Research plan' },
    });
  });

  it('shows validation errors for boolean enum submissions', () => {
    const handleFollowUp = vi.fn();
    const spec = {
      version: 1,
      instruction: 'Continue with the accepted terms.',
      schema: {
        type: 'object',
        properties: {
          accepted: { type: 'boolean', title: 'Accept terms', enum: [true] },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={spec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.click(renderer.container.querySelector<HTMLInputElement>('input[name="accepted"]')!);
    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('Choose an allowed option.');
  });

  it('rejects interaction state that exceeds the follow-up payload limit', () => {
    const handleFollowUp = vi.fn();
    const spec = {
      version: 1,
      instruction: 'Continue with these notes.',
      schema: {
        type: 'object',
        properties: {
          notes: { type: 'string', title: 'Notes', format: 'textarea' },
        },
      },
    } satisfies LiveArtifactInteractionSpec;

    act(() => {
      renderer.root.render(<LiveArtifactInteractionFrame spec={spec} onFollowUp={handleFollowUp} />);
    });

    fireEvent.change(renderer.container.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')!, {
      target: { value: 'x'.repeat(7000) },
    });
    fireEvent.submit(renderer.container.querySelector<HTMLFormElement>('[data-live-artifact-interaction="true"]')!);

    expect(handleFollowUp).not.toHaveBeenCalled();
    expect(renderer.container.textContent).toContain('The submitted interaction state is too large.');
  });
});
