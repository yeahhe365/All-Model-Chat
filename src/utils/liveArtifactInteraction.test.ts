import { describe, expect, it } from 'vitest';
import { parseLiveArtifactInteractionSpec } from './liveArtifactInteraction';

describe('liveArtifactInteraction utilities', () => {
  it('rejects enum defaults that are outside the declared options', () => {
    const interaction = {
      instruction: 'Continue with the selected option.',
      schema: {
        type: 'object',
        properties: {
          tone: {
            type: 'string',
            enum: ['brief', 'detailed'],
            default: 'balanced',
          },
        },
      },
    };

    expect(parseLiveArtifactInteractionSpec(JSON.stringify(interaction))).toBeNull();
  });

  it('rejects non-integer defaults and enum options for integer fields', () => {
    const interactionWithDecimalDefault = {
      instruction: 'Continue with the chosen count.',
      schema: {
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            default: 1.5,
          },
        },
      },
    };
    const interactionWithDecimalEnum = {
      instruction: 'Continue with the chosen count.',
      schema: {
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            enum: [1, 2.5],
          },
        },
      },
    };

    expect(parseLiveArtifactInteractionSpec(JSON.stringify(interactionWithDecimalDefault))).toBeNull();
    expect(parseLiveArtifactInteractionSpec(JSON.stringify(interactionWithDecimalEnum))).toBeNull();
  });
});
