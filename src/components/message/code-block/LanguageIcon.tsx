import React from 'react';
import { Atom, Braces, FileCode2, FileJson, FileText, Workflow } from 'lucide-react';
import {
  IconCLang,
  IconCpp,
  IconCSharp,
  IconDart,
  IconGo,
  IconHtml5,
  IconIni,
  IconJava,
  IconKotlin,
  IconLua,
  IconPhp,
  IconPython,
  IconRuby,
  IconRust,
  IconShell,
  IconSql,
  IconSwift,
  IconToml,
  IconTypeScript,
  IconYaml,
} from '../../icons/CustomIcons';

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
const LANGUAGE_ICON_SIZE = 20;
const STROKE_LANGUAGE_ICON_SIZE = 18;

const getLanguageBadgeConfig = (language: string): LanguageBadgeConfig => {
  const lang = normalizeLanguage(language || 'text');

  if (['py', 'py3', 'python'].includes(lang)) {
    return {
      badgeId: 'python',
      iconId: 'python',
      displayName: 'Python',
      renderIcon: () => <IconPython size={LANGUAGE_ICON_SIZE} className="text-[#4f8ff7]" color="currentColor" />,
    };
  }

  if (['tsx'].includes(lang)) {
    return {
      badgeId: 'tsx',
      iconId: 'tsx',
      displayName: 'TypeScript React',
      compactLabel: 'TSX',
      renderIcon: () => <IconTypeScript size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['ts', 'typescript'].includes(lang)) {
    return {
      badgeId: 'typescript',
      iconId: 'typescript',
      displayName: 'TypeScript',
      renderIcon: () => <IconTypeScript size={LANGUAGE_ICON_SIZE} />,
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
      renderIcon: () => <Atom size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-[#61dafb]" />,
    };
  }

  if (['html', 'htm'].includes(lang)) {
    return {
      badgeId: 'html',
      iconId: 'html',
      displayName: 'HTML',
      renderIcon: () => <IconHtml5 size={LANGUAGE_ICON_SIZE} />,
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

  if (['go', 'golang'].includes(lang)) {
    return {
      badgeId: 'go',
      iconId: 'go',
      displayName: 'Go',
      renderIcon: () => <IconGo size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['rust', 'rs'].includes(lang)) {
    return {
      badgeId: 'rust',
      iconId: 'rust',
      displayName: 'Rust',
      renderIcon: () => <IconRust size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['java', 'jvm'].includes(lang)) {
    return {
      badgeId: 'java',
      iconId: 'java',
      displayName: 'Java',
      renderIcon: () => <IconJava size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['cs', 'csharp', 'c#'].includes(lang)) {
    return {
      badgeId: 'csharp',
      iconId: 'csharp',
      displayName: 'C#',
      renderIcon: () => <IconCSharp size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['kotlin', 'kt', 'android'].includes(lang)) {
    return {
      badgeId: 'kotlin',
      iconId: 'kotlin',
      displayName: 'Kotlin',
      renderIcon: () => <IconKotlin size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['rb', 'ruby', 'rails'].includes(lang)) {
    return {
      badgeId: 'ruby',
      iconId: 'ruby',
      displayName: 'Ruby',
      renderIcon: () => <IconRuby size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['php'].includes(lang)) {
    return {
      badgeId: 'php',
      iconId: 'php',
      displayName: 'PHP',
      renderIcon: () => <IconPhp size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['swift'].includes(lang)) {
    return {
      badgeId: 'swift',
      iconId: 'swift',
      displayName: 'Swift',
      renderIcon: () => <IconSwift size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['dart'].includes(lang)) {
    return {
      badgeId: 'dart',
      iconId: 'dart',
      displayName: 'Dart',
      renderIcon: () => <IconDart size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['lua'].includes(lang)) {
    return {
      badgeId: 'lua',
      iconId: 'lua',
      displayName: 'Lua',
      renderIcon: () => <IconLua size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['c', 'h'].includes(lang)) {
    return {
      badgeId: 'c',
      iconId: 'c',
      displayName: 'C',
      renderIcon: () => <IconCLang size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['cpp', 'c++', 'hpp'].includes(lang)) {
    return {
      badgeId: 'cpp',
      iconId: 'cpp',
      displayName: 'C++',
      renderIcon: () => <IconCpp size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['json', 'json5'].includes(lang)) {
    return {
      badgeId: 'json',
      iconId: 'json',
      displayName: 'JSON',
      renderIcon: () => <FileJson size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-yellow-500" />,
    };
  }

  if (['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'].includes(lang)) {
    return {
      badgeId: 'sql',
      iconId: 'sql',
      displayName: 'SQL',
      renderIcon: () => <IconSql size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['sh', 'bash', 'zsh', 'shell', 'terminal', 'powershell', 'ps1', 'batch', 'cmd'].includes(lang)) {
    return {
      badgeId: 'shell',
      iconId: 'shell',
      displayName: 'Shell',
      renderIcon: () => <IconShell size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['mermaid', 'graphviz', 'dot'].includes(lang)) {
    return {
      badgeId: lang,
      iconId: lang,
      displayName: lang === 'dot' ? 'Graphviz DOT' : lang === 'graphviz' ? 'Graphviz' : 'Mermaid',
      compactLabel: lang === 'mermaid' ? 'MMD' : 'DOT',
      renderIcon: () => <Workflow size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-pink-400" />,
    };
  }

  if (['yaml', 'yml'].includes(lang)) {
    return {
      badgeId: 'yaml',
      iconId: 'yaml',
      displayName: 'YAML',
      renderIcon: () => <IconYaml size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['toml'].includes(lang)) {
    return {
      badgeId: 'toml',
      iconId: 'toml',
      displayName: 'TOML',
      renderIcon: () => <IconToml size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['ini', 'config'].includes(lang)) {
    return {
      badgeId: 'ini',
      iconId: 'ini',
      displayName: 'INI',
      renderIcon: () => <IconIni size={LANGUAGE_ICON_SIZE} />,
    };
  }

  if (['md', 'markdown', 'csv', 'txt', 'text', 'log'].includes(lang)) {
    return {
      badgeId: lang,
      iconId: 'text',
      displayName: lang === 'md' ? 'Markdown' : lang.toUpperCase(),
      compactLabel: lang === 'markdown' ? 'MD' : undefined,
      renderIcon: () => (
        <FileText
          size={STROKE_LANGUAGE_ICON_SIZE}
          strokeWidth={2.1}
          className="text-[var(--theme-text-secondary)]"
        />
      ),
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
      renderIcon: () => <Braces size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-violet-400" />,
    };
  }

  return {
    badgeId: lang,
    iconId: 'generic',
    displayName: lang,
    renderIcon: () => <FileCode2 size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-gray-400" />,
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
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center"
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
