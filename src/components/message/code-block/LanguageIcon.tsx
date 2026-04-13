
import React from 'react';
import {
    Braces,
    Database,
    FileCode2,
    FileJson,
    FileText,
    Globe,
    Terminal,
    Workflow
} from 'lucide-react';

export const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
    const lang = language ? language.toLowerCase() : 'text';
    
    const getIcon = (l: string) => {
        if (['json', 'json5'].includes(l)) return { Icon: FileJson, className: 'text-yellow-500' };
        if (['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'].includes(l)) return { Icon: Database, className: 'text-sky-400' };
        if (['sh', 'bash', 'zsh', 'shell', 'terminal', 'powershell', 'ps1', 'batch', 'cmd'].includes(l)) return { Icon: Terminal, className: 'text-emerald-400' };
        if (['html', 'htm', 'xml', 'svg', 'css', 'scss', 'sass', 'less', 'react', 'jsx', 'tsx', 'vue', 'vuejs', 'angular', 'ng'].includes(l)) {
            return { Icon: Globe, className: 'text-cyan-400' };
        }
        if (['mermaid', 'graphviz', 'dot'].includes(l)) return { Icon: Workflow, className: 'text-pink-400' };
        if (['md', 'markdown', 'csv', 'txt', 'text', 'log', 'yaml', 'yml', 'toml', 'ini', 'config'].includes(l)) {
            return { Icon: FileText, className: 'text-[var(--theme-text-secondary)]' };
        }
        if (['js', 'javascript', 'ts', 'typescript', 'node', 'nodejs', 'py', 'python', 'py3', 'php', 'rb', 'ruby', 'rails', 'lua', 'pl', 'perl', 'java', 'jvm', 'c', 'cpp', 'c++', 'h', 'hpp', 'cs', 'csharp', 'c#', 'go', 'golang', 'rust', 'rs', 'swift', 'r', 'android', 'kotlin', 'kt', 'docker', 'dockerfile', 'git', 'diff', 'aws', 'jenkins', 'npm', 'yarn', 'pnpm'].includes(l)) {
            return { Icon: Braces, className: 'text-violet-400' };
        }
        return { Icon: FileCode2, className: 'text-gray-400' };
    };

    const { Icon, className } = getIcon(lang);

    return (
        <div className="flex items-center gap-2 select-none">
            <Icon size={18} className={className} aria-hidden="true" />
            <span className="text-[10px] font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider font-sans opacity-90">
                {lang}
            </span>
        </div>
    );
};
