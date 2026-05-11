import type { LiveArtifactFollowupPayload } from './liveArtifactFollowup';

const LIVE_ARTIFACT_INTERACTION_SOURCE = 'amc-live-artifact-interaction:v1';

export type LiveArtifactInteractionPrimitive = string | number | boolean;
export type LiveArtifactInteractionPropertyType = 'string' | 'number' | 'integer' | 'boolean';

export interface LiveArtifactInteractionProperty {
  type: LiveArtifactInteractionPropertyType;
  title?: string;
  description?: string;
  enum?: LiveArtifactInteractionPrimitive[];
  enumNames?: string[];
  default?: LiveArtifactInteractionPrimitive;
  format?: 'textarea' | string;
  minimum?: number;
  maximum?: number;
}

export interface LiveArtifactInteractionSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, LiveArtifactInteractionProperty>;
}

export interface LiveArtifactInteractionSpec {
  version: 1;
  title?: string;
  description?: string;
  instruction: string;
  submitLabel?: string;
  schema: LiveArtifactInteractionSchema;
}

export interface LiveArtifactInteractionField {
  key: string;
  label: string;
  description?: string;
  required: boolean;
  property: LiveArtifactInteractionProperty;
}

const MAX_FIELDS = 24;
const MAX_TEXT_LENGTH = 2000;
const MAX_SHORT_TEXT_LENGTH = 500;
const FIELD_KEY_REGEX = /^[A-Za-z0-9_.-]{1,80}$/;
const SUPPORTED_PROPERTY_TYPES = new Set<LiveArtifactInteractionPropertyType>([
  'string',
  'number',
  'integer',
  'boolean',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const normalizeOptionalText = (value: unknown, maxLength = MAX_SHORT_TEXT_LENGTH): string | undefined | null => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.length <= maxLength ? trimmedValue : null;
};

const isPrimitive = (value: unknown): value is LiveArtifactInteractionPrimitive =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const isValidNumberForType = (value: unknown, type: LiveArtifactInteractionPropertyType): value is number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }

  return type !== 'integer' || Number.isInteger(value);
};

const arePrimitiveValuesEqual = (
  first: LiveArtifactInteractionPrimitive,
  second: LiveArtifactInteractionPrimitive,
): boolean => first === second;

const normalizePrimitiveDefault = (
  value: unknown,
  type: LiveArtifactInteractionPropertyType,
): LiveArtifactInteractionPrimitive | undefined | null => {
  if (value === undefined) {
    return undefined;
  }

  if (!isPrimitive(value)) {
    return null;
  }

  if (type === 'number' || type === 'integer') {
    return isValidNumberForType(value, type) ? value : null;
  }

  if (type === 'boolean') {
    return typeof value === 'boolean' ? value : null;
  }

  return typeof value === 'string' ? value : null;
};

const normalizeEnum = (
  value: unknown,
  type: LiveArtifactInteractionPropertyType,
): LiveArtifactInteractionPrimitive[] | undefined | null => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const normalizedValues = value.filter(isPrimitive);
  if (normalizedValues.length !== value.length) {
    return null;
  }

  if (type === 'number' || type === 'integer') {
    return normalizedValues.every((item) => isValidNumberForType(item, type)) ? normalizedValues : null;
  }

  if (type === 'boolean') {
    return normalizedValues.every((item) => typeof item === 'boolean') ? normalizedValues : null;
  }

  return normalizedValues.every((item) => typeof item === 'string') ? normalizedValues : null;
};

const normalizeEnumNames = (value: unknown, enumLength: number): string[] | undefined | null => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length !== enumLength) {
    return null;
  }

  const names = value.map((item) => normalizeOptionalText(item, MAX_SHORT_TEXT_LENGTH));
  if (names.some((item) => item === null || item === undefined)) {
    return null;
  }

  return names as string[];
};

const normalizeProperty = (value: unknown): LiveArtifactInteractionProperty | null => {
  if (!isPlainObject(value) || typeof value.type !== 'string') {
    return null;
  }

  const type = value.type.toLowerCase() as LiveArtifactInteractionPropertyType;
  if (!SUPPORTED_PROPERTY_TYPES.has(type)) {
    return null;
  }

  const title = normalizeOptionalText(value.title);
  const description = normalizeOptionalText(value.description, MAX_TEXT_LENGTH);
  const defaultValue = normalizePrimitiveDefault(value.default, type);
  const enumValues = normalizeEnum(value.enum, type);
  const enumNames = enumValues ? normalizeEnumNames(value.enumNames, enumValues.length) : undefined;
  const format = normalizeOptionalText(value.format, 80);

  if (
    title === null ||
    description === null ||
    defaultValue === null ||
    enumValues === null ||
    enumNames === null ||
    format === null
  ) {
    return null;
  }

  const minimum = typeof value.minimum === 'number' && Number.isFinite(value.minimum) ? value.minimum : undefined;
  const maximum = typeof value.maximum === 'number' && Number.isFinite(value.maximum) ? value.maximum : undefined;

  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    return null;
  }

  const isInsideBounds = (item: LiveArtifactInteractionPrimitive): boolean => {
    if (typeof item !== 'number') {
      return true;
    }

    return (minimum === undefined || item >= minimum) && (maximum === undefined || item <= maximum);
  };

  if (defaultValue !== undefined) {
    if (!isInsideBounds(defaultValue)) {
      return null;
    }

    if (enumValues && !enumValues.some((enumValue) => arePrimitiveValuesEqual(enumValue, defaultValue))) {
      return null;
    }
  }

  if (enumValues?.some((enumValue) => !isInsideBounds(enumValue))) {
    return null;
  }

  return {
    type,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(enumValues ? { enum: enumValues } : {}),
    ...(enumNames ? { enumNames } : {}),
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(format ? { format } : {}),
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
  };
};

export const parseLiveArtifactInteractionSpec = (content: string): LiveArtifactInteractionSpec | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.schema)) {
    return null;
  }

  const version = parsed.version === undefined ? 1 : parsed.version;
  if (version !== 1) {
    return null;
  }

  const instruction = normalizeOptionalText(parsed.instruction, MAX_TEXT_LENGTH);
  const title = normalizeOptionalText(parsed.title);
  const description = normalizeOptionalText(parsed.description, MAX_TEXT_LENGTH);
  const submitLabel = normalizeOptionalText(parsed.submitLabel, 120);
  if (!instruction || instruction === null || title === null || description === null || submitLabel === null) {
    return null;
  }

  if (parsed.schema.type !== 'object' || !isPlainObject(parsed.schema.properties)) {
    return null;
  }

  const propertyEntries = Object.entries(parsed.schema.properties);
  if (propertyEntries.length === 0 || propertyEntries.length > MAX_FIELDS) {
    return null;
  }

  const properties: Record<string, LiveArtifactInteractionProperty> = {};
  for (const [key, rawProperty] of propertyEntries) {
    if (!FIELD_KEY_REGEX.test(key)) {
      return null;
    }

    const property = normalizeProperty(rawProperty);
    if (!property) {
      return null;
    }

    properties[key] = property;
  }

  const required = Array.isArray(parsed.schema.required)
    ? parsed.schema.required.filter((key): key is string => typeof key === 'string' && key in properties)
    : undefined;

  return {
    version: 1,
    instruction,
    schema: {
      type: 'object',
      properties,
      ...(required && required.length > 0 ? { required } : {}),
    },
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(submitLabel ? { submitLabel } : {}),
  };
};

export const getLiveArtifactInteractionFields = (spec: LiveArtifactInteractionSpec): LiveArtifactInteractionField[] => {
  const requiredKeys = new Set(spec.schema.required ?? []);

  return Object.entries(spec.schema.properties).map(([key, property]) => ({
    key,
    label: property.title || key,
    description: property.description,
    required: requiredKeys.has(key),
    property,
  }));
};

export const getLiveArtifactInteractionDefaultValue = (
  property: LiveArtifactInteractionProperty,
): LiveArtifactInteractionPrimitive | '' => {
  if (property.default !== undefined) {
    return property.default;
  }

  if (property.enum && property.enum.length > 0) {
    return property.enum[0];
  }

  if (property.type === 'boolean') {
    return false;
  }

  return '';
};

export const buildLiveArtifactInteractionPayload = (
  spec: LiveArtifactInteractionSpec,
  state: Record<string, LiveArtifactInteractionPrimitive | ''>,
): LiveArtifactFollowupPayload => ({
  instruction: spec.instruction,
  ...(spec.title ? { title: spec.title } : {}),
  source: LIVE_ARTIFACT_INTERACTION_SOURCE,
  state,
});
