import { createI18nMock, createRealI18nMock } from './i18nTestDoubles';
import { createMockDbService, createMockLogService } from './serviceTestDoubles';

export const createDbServiceMockModule = (overrides?: Parameters<typeof createMockDbService>[0]) => ({
  dbService: createMockDbService(overrides),
});

export const createLogServiceMockModule = (overrides?: Parameters<typeof createMockLogService>[0]) => ({
  logService: createMockLogService(overrides),
});

export const createI18nMockModule = (options?: Parameters<typeof createI18nMock>[0]) => createI18nMock(options);

export const createRealI18nMockModule = (language?: Parameters<typeof createRealI18nMock>[0]) =>
  createRealI18nMock(language);
