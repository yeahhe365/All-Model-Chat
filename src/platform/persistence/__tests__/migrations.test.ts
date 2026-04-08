import { describe, expect, it, vi } from 'vitest';
import {
  detectAppSettingsSchemaVersion,
  loadMigratedAppSettings,
  migrateAppSettingsToCurrentSchema,
  saveAppSettingsAtCurrentSchema,
} from '../migrations';
import { CURRENT_APP_SCHEMA_VERSION, LEGACY_APP_SCHEMA_VERSION } from '../schema';

describe('persistence migrations', () => {
  it('detects legacy settings without a schema version key', () => {
    expect(
      detectAppSettingsSchemaVersion(undefined, { temperature: 0.5 } as any)
    ).toBe(LEGACY_APP_SCHEMA_VERSION);
  });

  it('treats empty storage as already current schema', () => {
    expect(detectAppSettingsSchemaVersion(undefined, null)).toBe(CURRENT_APP_SCHEMA_VERSION);
  });

  it('runs the legacy app-settings migration as a no-op', () => {
    const settings = { temperature: 0.5 } as any;

    expect(
      migrateAppSettingsToCurrentSchema(settings, LEGACY_APP_SCHEMA_VERSION)
    ).toEqual({
      settings,
      schemaVersion: CURRENT_APP_SCHEMA_VERSION,
    });
  });

  it('persists the current schema version after loading legacy settings', async () => {
    const setSchemaVersion = vi.fn().mockResolvedValue(undefined);

    const result = await loadMigratedAppSettings({
      getAppSettings: vi.fn().mockResolvedValue({ temperature: 0.5 }),
      getSchemaVersion: vi.fn().mockResolvedValue(undefined),
      setSchemaVersion,
    });

    expect(result).toEqual({
      settings: { temperature: 0.5 },
      schemaVersion: CURRENT_APP_SCHEMA_VERSION,
      isFutureSchema: false,
    });
    expect(setSchemaVersion).toHaveBeenCalledWith(CURRENT_APP_SCHEMA_VERSION);
  });

  it('does not rewrite future schema versions', async () => {
    const setSchemaVersion = vi.fn().mockResolvedValue(undefined);

    const result = await loadMigratedAppSettings({
      getAppSettings: vi.fn().mockResolvedValue({ temperature: 0.5 }),
      getSchemaVersion: vi.fn().mockResolvedValue(CURRENT_APP_SCHEMA_VERSION + 5),
      setSchemaVersion,
    });

    expect(result).toEqual({
      settings: { temperature: 0.5 },
      schemaVersion: CURRENT_APP_SCHEMA_VERSION + 5,
      isFutureSchema: true,
    });
    expect(setSchemaVersion).not.toHaveBeenCalled();
  });

  it('writes app settings and schema version together', async () => {
    const setAppSettings = vi.fn().mockResolvedValue(undefined);
    const setSchemaVersion = vi.fn().mockResolvedValue(undefined);
    const settings = { temperature: 0.5 } as any;

    await saveAppSettingsAtCurrentSchema(settings, {
      setAppSettings,
      setSchemaVersion,
    });

    expect(setAppSettings).toHaveBeenCalledWith(settings);
    expect(setSchemaVersion).toHaveBeenCalledWith(CURRENT_APP_SCHEMA_VERSION);
  });
});
