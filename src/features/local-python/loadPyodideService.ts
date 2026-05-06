import type { PyodideFile } from './pyodideService';

let pyodideServicePromise: Promise<(typeof import('./pyodideService'))['pyodideService']> | null = null;

export const getPyodideService = async () => {
  if (!pyodideServicePromise) {
    pyodideServicePromise = import('./pyodideService').then((module) => module.pyodideService);
  }

  return pyodideServicePromise;
};

export type { PyodideFile };
