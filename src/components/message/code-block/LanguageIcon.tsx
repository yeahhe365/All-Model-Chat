import React from 'react';
import { Atom, Braces, Database, FileCode2, FileJson, FileText, Terminal, Workflow } from 'lucide-react';
import { IconHtml5, IconPython } from '../../icons/CustomIcons';

type LanguageBadgeConfig = {
  badgeId: string;
  iconId: string;
  displayName: string;
  compactLabel?: string;
  renderIcon: () => React.ReactNode;
};

const TextGlyph: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span
    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 text-[9px] font-black uppercase tracking-[0.12em] ${className}`}
    aria-hidden="true"
  >
    {label}
  </span>
);

const normalizeLanguage = (language: string) => language.trim().toLowerCase();

const getLanguageBadgeConfig = (language: string): LanguageBadgeConfig => {
  const lang = normalizeLanguage(language || 'text');

  if (['py', 'py3', 'python'].includes(lang)) {
    return {
      badgeId: 'python',
      iconId: 'python',
      displayName: 'Python',
      renderIcon: () => <IconPython size={16} className="text-[#4f8ff7]" color="currentColor" />,
    };
  }

  if (['tsx'].includes(lang)) {
    return {
      badgeId: 'tsx',
      iconId: 'tsx',
      displayName: 'TypeScript React',
      compactLabel: 'TSX',
      renderIcon: () => <TextGlyph label="TS" className="bg-[#2563eb] text-white" />,
    };
  }

  if (['ts', 'typescript'].includes(lang)) {
    return {
      badgeId: 'typescript',
      iconId: 'typescript',
      displayName: 'TypeScript',
      renderIcon: () => <TextGlyph label="TS" className="bg-[#3178c6] text-white" />,
    };
  }

  if (['js', 'javascript', 'node', 'nodejs'].includes(lang)) {
    return {
      badgeId: 'javascript',
      iconId: 'javascript',
      displayName: 'JavaScript',
      renderIcon: () => <TextGlyph label="JS" className="bg-[#f7df1e] text-black" />,
    };
  }

  if (['jsx', 'react'].includes(lang)) {
    return {
      badgeId: 'jsx',
      iconId: 'react',
      displayName: 'React JSX',
      compactLabel: 'JSX',
      renderIcon: () => <Atom size={14} strokeWidth={2.1} className="text-[#61dafb]" />,
    };
  }

  if (['html', 'htm'].includes(lang)) {
    return {
      badgeId: 'html',
      iconId: 'html',
      displayName: 'HTML',
      renderIcon: () => <IconHtml5 size={14} />,
    };
  }

  if (['css', 'scss', 'sass', 'less'].includes(lang)) {
    return {
      badgeId: 'css',
      iconId: 'css',
      displayName: 'CSS',
      renderIcon: () => <TextGlyph label="CSS" className="bg-[#1d4ed8] text-white" />,
    };
  }

  if (['json', 'json5'].includes(lang)) {
    return {
      badgeId: 'json',
      iconId: 'json',
      displayName: 'JSON',
      renderIcon: () => <FileJson size={14} strokeWidth={2.1} className="text-yellow-500" />,
    };
  }

  if (['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'].includes(lang)) {
    return {
      badgeId: 'sql',
      iconId: 'sql',
      displayName: 'SQL',
      renderIcon: () => <Database size={14} strokeWidth={2.1} className="text-sky-400" />,
    };
  }

  if (['sh', 'bash', 'zsh', 'shell', 'terminal', 'powershell', 'ps1', 'batch', 'cmd'].includes(lang)) {
    return {
      badgeId: 'shell',
      iconId: 'shell',
      displayName: 'Shell',
      renderIcon: () => <Terminal size={14} strokeWidth={2.1} className="text-emerald-400" />,
    };
  }

  if (['mermaid', 'graphviz', 'dot'].includes(lang)) {
    return {
      badgeId: lang,
      iconId: lang,
      displayName: lang === 'dot' ? 'Graphviz DOT' : lang === 'graphviz' ? 'Graphviz' : 'Mermaid',
      compactLabel: lang === 'mermaid' ? 'MMD' : 'DOT',
      renderIcon: () => <Workflow size={14} strokeWidth={2.1} className="text-pink-400" />,
    };
  }

  if (['md', 'markdown', 'csv', 'txt', 'text', 'log', 'yaml', 'yml', 'toml', 'ini', 'config'].includes(lang)) {
    return {
      badgeId: lang,
      iconId: 'text',
      displayName: lang === 'md' ? 'Markdown' : lang.toUpperCase(),
      compactLabel: lang === 'markdown' ? 'MD' : undefined,
      renderIcon: () => <FileText size={14} strokeWidth={2.1} className="text-[var(--theme-text-secondary)]" />,
    };
  }

  if (
    [
      'php',
      'rb',
      'ruby',
      'rails',
      'lua',
      'pl',
      'perl',
      'java',
      'jvm',
      'c',
      'cpp',
      'c++',
      'h',
      'hpp',
      'cs',
      'csharp',
      'c#',
      'go',
      'golang',
      'rust',
      'rs',
      'swift',
      'r',
      'android',
      'kotlin',
      'kt',
      'docker',
      'dockerfile',
      'git',
      'diff',
      'aws',
      'jenkins',
      'npm',
      'yarn',
      'pnpm',
      'xml',
      'svg',
      'vue',
      'vuejs',
      'angular',
      'ng',
    ].includes(lang)
  ) {
    return {
      badgeId: lang,
      iconId: 'braces',
      displayName: lang.toUpperCase(),
      renderIcon: () => <Braces size={14} strokeWidth={2.1} className="text-violet-400" />,
    };
  }

  return {
    badgeId: lang,
    iconId: 'generic',
    displayName: lang,
    renderIcon: () => <FileCode2 size={14} strokeWidth={2.1} className="text-gray-400" />,
  };
};

export const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
  const config = getLanguageBadgeConfig(language || 'text');

  return (
    <div
      data-language-badge={config.badgeId}
      className="inline-flex max-w-full items-center gap-1.5 select-none"
      title={config.displayName}
    >
      <span
        data-language-icon={config.iconId}
        className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {config.renderIcon()}
      </span>
      <span data-language-meta className="inline-flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[10px] font-bold uppercase leading-none tracking-wider text-[var(--theme-text-secondary)]">
          {config.displayName}
        </span>
        {config.compactLabel && (
          <span className="truncate text-[9px] font-mono font-semibold uppercase leading-none tracking-[0.12em] text-[var(--theme-text-tertiary)]">
            {config.compactLabel}
          </span>
        )}
      </span>
    </div>
  );
};
