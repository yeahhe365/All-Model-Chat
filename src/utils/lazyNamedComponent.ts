import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// React.lazy models lazy-loadable components as ComponentType<any>; keep the escape hatch local to this helper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export const loadNamedComponent = async <TExportName extends string, TModule extends Record<TExportName, AnyComponent>>(
  importer: () => Promise<TModule>,
  exportName: TExportName,
): Promise<{ default: TModule[TExportName] }> => {
  const module = await importer();
  return { default: module[exportName] };
};

export const lazyNamedComponent = <TExportName extends string, TModule extends Record<TExportName, AnyComponent>>(
  importer: () => Promise<TModule>,
  exportName: TExportName,
): LazyExoticComponent<TModule[TExportName]> => lazy(() => loadNamedComponent(importer, exportName));
