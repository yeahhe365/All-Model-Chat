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
} from '@/components/icons/CustomIcons';

type LanguageBadgeConfig = {
  badgeId: string;
  iconId: string;
  displayName: string;
  compactLabel?: string;
  renderIcon: () => React.ReactNode;
};

type LanguageBadgeEntry = Omit<LanguageBadgeConfig, 'iconId'> & {
  aliases: string[];
  iconId?: string;
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

const languageBadge = (entry: LanguageBadgeEntry): LanguageBadgeEntry => entry;

const LANGUAGE_BADGE_ENTRIES = [
  languageBadge({
    aliases: ['py', 'py3', 'python'],
    badgeId: 'python',
    displayName: 'Python',
    renderIcon: () => <IconPython size={LANGUAGE_ICON_SIZE} className="text-[#4f8ff7]" color="currentColor" />,
  }),
  languageBadge({
    aliases: ['tsx'],
    badgeId: 'tsx',
    displayName: 'TypeScript React',
    compactLabel: 'TSX',
    renderIcon: () => <IconTypeScript size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['ts', 'typescript'],
    badgeId: 'typescript',
    displayName: 'TypeScript',
    renderIcon: () => <IconTypeScript size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['js', 'javascript', 'node', 'nodejs'],
    badgeId: 'javascript',
    displayName: 'JavaScript',
    renderIcon: () => <TextGlyph label="JS" className="bg-[#f7df1e] text-black" />,
  }),
  languageBadge({
    aliases: ['jsx', 'react'],
    badgeId: 'jsx',
    iconId: 'react',
    displayName: 'React JSX',
    compactLabel: 'JSX',
    renderIcon: () => <Atom size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-[#61dafb]" />,
  }),
  languageBadge({
    aliases: ['html', 'htm'],
    badgeId: 'html',
    displayName: 'HTML',
    renderIcon: () => <IconHtml5 size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['css', 'scss', 'sass', 'less'],
    badgeId: 'css',
    displayName: 'CSS',
    renderIcon: () => <TextGlyph label="CSS" className="bg-[#1d4ed8] text-white" />,
  }),
  languageBadge({
    aliases: ['go', 'golang'],
    badgeId: 'go',
    displayName: 'Go',
    renderIcon: () => <IconGo size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['rust', 'rs'],
    badgeId: 'rust',
    displayName: 'Rust',
    renderIcon: () => <IconRust size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['java', 'jvm'],
    badgeId: 'java',
    displayName: 'Java',
    renderIcon: () => <IconJava size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['cs', 'csharp', 'c#'],
    badgeId: 'csharp',
    displayName: 'C#',
    renderIcon: () => <IconCSharp size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['kotlin', 'kt', 'android'],
    badgeId: 'kotlin',
    displayName: 'Kotlin',
    renderIcon: () => <IconKotlin size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['rb', 'ruby', 'rails'],
    badgeId: 'ruby',
    displayName: 'Ruby',
    renderIcon: () => <IconRuby size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['php'],
    badgeId: 'php',
    displayName: 'PHP',
    renderIcon: () => <IconPhp size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['swift'],
    badgeId: 'swift',
    displayName: 'Swift',
    renderIcon: () => <IconSwift size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['dart'],
    badgeId: 'dart',
    displayName: 'Dart',
    renderIcon: () => <IconDart size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['lua'],
    badgeId: 'lua',
    displayName: 'Lua',
    renderIcon: () => <IconLua size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['c', 'h'],
    badgeId: 'c',
    displayName: 'C',
    renderIcon: () => <IconCLang size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['cpp', 'c++', 'hpp'],
    badgeId: 'cpp',
    displayName: 'C++',
    renderIcon: () => <IconCpp size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['json', 'json5'],
    badgeId: 'json',
    displayName: 'JSON',
    renderIcon: () => <FileJson size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-yellow-500" />,
  }),
  languageBadge({
    aliases: ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'],
    badgeId: 'sql',
    displayName: 'SQL',
    renderIcon: () => <IconSql size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['sh', 'bash', 'zsh', 'shell', 'terminal', 'powershell', 'ps1', 'batch', 'cmd'],
    badgeId: 'shell',
    displayName: 'Shell',
    renderIcon: () => <IconShell size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['yaml', 'yml'],
    badgeId: 'yaml',
    displayName: 'YAML',
    renderIcon: () => <IconYaml size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['toml'],
    badgeId: 'toml',
    displayName: 'TOML',
    renderIcon: () => <IconToml size={LANGUAGE_ICON_SIZE} />,
  }),
  languageBadge({
    aliases: ['ini', 'config'],
    badgeId: 'ini',
    displayName: 'INI',
    renderIcon: () => <IconIni size={LANGUAGE_ICON_SIZE} />,
  }),
];

const LANGUAGE_BADGE_CONFIGS = new Map<string, LanguageBadgeConfig>(
  LANGUAGE_BADGE_ENTRIES.flatMap((entry) =>
    entry.aliases.map((alias) => [
      alias,
      {
        badgeId: entry.badgeId,
        iconId: entry.iconId ?? entry.badgeId,
        displayName: entry.displayName,
        compactLabel: entry.compactLabel,
        renderIcon: entry.renderIcon,
      },
    ]),
  ),
);

const BRACES_ICON_LANGUAGES = new Set([
  'pl',
  'perl',
  'r',
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
]);

const getLanguageBadgeConfig = (language: string): LanguageBadgeConfig => {
  const lang = normalizeLanguage(language || 'text');
  const mappedConfig = LANGUAGE_BADGE_CONFIGS.get(lang);
  if (mappedConfig) {
    return mappedConfig;
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

  if (['md', 'markdown', 'csv', 'txt', 'text', 'log'].includes(lang)) {
    return {
      badgeId: lang,
      iconId: 'text',
      displayName: lang === 'md' ? 'Markdown' : lang.toUpperCase(),
      compactLabel: lang === 'markdown' ? 'MD' : undefined,
      renderIcon: () => (
        <FileText size={STROKE_LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-[var(--theme-text-secondary)]" />
      ),
    };
  }

  if (BRACES_ICON_LANGUAGES.has(lang)) {
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
