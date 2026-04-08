import { AppSettings } from '../../types';
import { CURRENT_APP_SCHEMA_VERSION, LEGACY_APP_SCHEMA_VERSION } from './schema';

interface AppSettingsPersistenceReader {
  getAppSettings: () => Promise<AppSettings | null | undefined>;
  getSchemaVersion: () => Promise<number | null | undefined>;
  setSchemaVersion: (version: number) => Promise<void>;
}

interface AppSettingsPersistenceWriter {
  setAppSettings: (settings: AppSettings) => Promise<void>;
  setSchemaVersion: (version: number) => Promise<void>;
}

interface LoadedAppSettings {
  settings: AppSettings | null;
  schemaVersion: number;
  isFutureSchema: boolean;
}

type AppSettingsMigration = (settings: AppSettings | null) => AppSettings | null;

const APP_SETTINGS_MIGRATIONS: Record<number, AppSettingsMigration> = {
  [LEGACY_APP_SCHEMA_VERSION]: (settings) => settings,
};

export const detectAppSettingsSchemaVersion = (
  storedSchemaVersion: number | null | undefined,
  storedSettings: AppSettings | null | undefined
) => {
  if (Number.isInteger(storedSchemaVersion) && (storedSchemaVersion as number) >= LEGACY_APP_SCHEMA_VERSION) {
    return storedSchemaVersion as number;
  }

  return storedSettings ? LEGACY_APP_SCHEMA_VERSION : CURRENT_APP_SCHEMA_VERSION;
};

export const migrateAppSettingsToCurrentSchema = (
  storedSettings: AppSettings | null | undefined,
  fromSchemaVersion: number
) => {
  let schemaVersion = fromSchemaVersion;
  let settings = storedSettings ?? null;

  while (schemaVersion < CURRENT_APP_SCHEMA_VERSION) {
    const migration = APP_SETTINGS_MIGRATIONS[schemaVersion];

    if (!migration) {
      throw new Error(`Missing app settings migration for schema version ${schemaVersion}`);
    }

    settings = migration(settings);
    schemaVersion += 1;
  }

  return {
    settings,
    schemaVersion,
  };
};

export const loadMigratedAppSettings = async ({
  getAppSettings,
  getSchemaVersion,
  setSchemaVersion,
}: AppSettingsPersistenceReader): Promise<LoadedAppSettings> => {
  const [storedSettings, storedSchemaVersion] = await Promise.all([
    getAppSettings(),
    getSchemaVersion(),
  ]);

  const detectedSchemaVersion = detectAppSettingsSchemaVersion(storedSchemaVersion, storedSettings);

  if (detectedSchemaVersion > CURRENT_APP_SCHEMA_VERSION) {
    return {
      settings: storedSettings ?? null,
      schemaVersion: detectedSchemaVersion,
      isFutureSchema: true,
    };
  }

  const migrated = migrateAppSettingsToCurrentSchema(storedSettings, detectedSchemaVersion);
  const shouldPersistSchemaVersion = Boolean(storedSettings) && storedSchemaVersion !== migrated.schemaVersion;

  if (shouldPersistSchemaVersion) {
    await setSchemaVersion(migrated.schemaVersion);
  }

  return {
    settings: migrated.settings,
    schemaVersion: migrated.schemaVersion,
    isFutureSchema: false,
  };
};

export const saveAppSettingsAtCurrentSchema = async (
  settings: AppSettings,
  { setAppSettings, setSchemaVersion }: AppSettingsPersistenceWriter
) => {
  await Promise.all([
    setAppSettings(settings),
    setSchemaVersion(CURRENT_APP_SCHEMA_VERSION),
  ]);
};
