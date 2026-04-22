import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import type { UpdateServiceWorker } from './register';

type RegisterSW = (options?: RegisterSWOptions) => UpdateServiceWorker;

export const loadRegisterSW = async (): Promise<RegisterSW> => {
  const { registerSW } = await import('virtual:pwa-register');
  return registerSW;
};
