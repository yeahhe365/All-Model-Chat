import { createMockDbService, createMockLogService } from './serviceTestDoubles';

export const createDbServiceMockModule = (overrides?: Parameters<typeof createMockDbService>[0]) => ({
  dbService: createMockDbService(overrides),
});

export const createLogServiceMockModule = (overrides?: Parameters<typeof createMockLogService>[0]) => ({
  logService: createMockLogService(overrides),
});
