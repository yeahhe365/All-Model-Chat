const MERMAID_DIST_IMPORTER_PATTERN = /node_modules[\\/]mermaid[\\/]dist[\\/]/;
const MERMAID_DISABLED_MODULE_PREFIX = '\0disabled-mermaid-diagram:';
const DISABLED_MERMAID_DIAGRAMS = [
  {
    id: 'flowchart-elk',
    pattern: /^\.\/flowchart-elk-definition-[^/]+\.js$/,
    message:
      'Mermaid flowchart-elk support is disabled in this build to reduce bundle size. Use standard flowchart/graph diagrams instead.',
  },
  {
    id: 'mindmap',
    pattern: /^\.\/mindmap-definition-[^/]+\.js$/,
    message: 'Mermaid mindmap support is disabled in this build to reduce bundle size.',
  },
] as const;

export const createDisabledMermaidDiagramPlugin = () => {
  return {
    name: 'disabled-mermaid-diagrams',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      if (!importer || !MERMAID_DIST_IMPORTER_PATTERN.test(importer)) return null;

      const disabledDiagram = DISABLED_MERMAID_DIAGRAMS.find(({ pattern }) => pattern.test(source));
      if (!disabledDiagram) return null;

      return `${MERMAID_DISABLED_MODULE_PREFIX}${disabledDiagram.id}`;
    },
    load(id: string) {
      if (!id.startsWith(MERMAID_DISABLED_MODULE_PREFIX)) return null;

      const diagramId = id.slice(MERMAID_DISABLED_MODULE_PREFIX.length);
      const disabledDiagram = DISABLED_MERMAID_DIAGRAMS.find(({ id: disabledId }) => disabledId === diagramId);
      if (!disabledDiagram) return null;

      return `
const message = ${JSON.stringify(disabledDiagram.message)};

export const diagram = {
  db: {
    clear() {},
  },
  renderer: {
    draw() {
      throw new Error(message);
    },
  },
  parser: {
    parser: { yy: {} },
    parse() {
      throw new Error(message);
    },
  },
  styles: () => '',
  init: () => undefined,
};
`;
    },
  };
};
