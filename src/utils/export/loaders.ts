export const loadExportModules = async () => {
  const [files, dom, image, templates] = await Promise.all([
    import('./files'),
    import('./dom'),
    import('./image'),
    import('./templates'),
  ]);

  return {
    ...files,
    ...dom,
    ...image,
    ...templates,
  };
};
