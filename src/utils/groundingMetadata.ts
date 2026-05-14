export interface GroundingSource {
  uri?: string;
  title?: string;
}

export interface GroundingChunkLike {
  web?: GroundingSource;
  image?: {
    sourceUri?: string;
    imageUri?: string;
    title?: string;
    domain?: string;
  };
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getGroundingChunkSource = (chunk: GroundingChunkLike): GroundingSource | undefined => {
  if (chunk.web?.uri) {
    return chunk.web;
  }

  if (chunk.image?.sourceUri) {
    return {
      uri: chunk.image.sourceUri,
      title: chunk.image.title || chunk.image.domain,
    };
  }

  return undefined;
};
