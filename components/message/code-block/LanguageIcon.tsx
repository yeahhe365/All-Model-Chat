
import React from 'react';

export const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
    const lang = language ? language.toLowerCase() : 'text';
    
    const getIcon = (l: string) => {
        // Web / Scripting
        if (['js', 'javascript', 'node', 'nodejs'].includes(l)) return 'fa-brands fa-js text-yellow-400';
        if (['ts', 'typescript'].includes(l)) return 'fa-solid fa-code text-blue-400'; // No FA brand for TS yet, use generic code
        if (['py', 'python', 'py3'].includes(l)) return 'fa-brands fa-python text-blue-500';
        if (['php'].includes(l)) return 'fa-brands fa-php text-indigo-400';
        if (['rb', 'ruby', 'rails'].includes(l)) return 'fa-solid fa-gem text-red-500';
        if (['lua'].includes(l)) return 'fa-solid fa-moon text-blue-300';
        if (['pl', 'perl'].includes(l)) return 'fa-solid fa-code text-indigo-500';

        // Frontend
        if (['html', 'htm', 'xml', 'svg'].includes(l)) return 'fa-brands fa-html5 text-orange-600';
        if (['css'].includes(l)) return 'fa-brands fa-css3-alt text-blue-600';
        if (['scss', 'sass', 'less'].includes(l)) return 'fa-brands fa-sass text-pink-500';
        if (['react', 'jsx', 'tsx'].includes(l)) return 'fa-brands fa-react text-cyan-400';
        if (['vue', 'vuejs'].includes(l)) return 'fa-brands fa-vuejs text-emerald-500';
        if (['angular', 'ng'].includes(l)) return 'fa-brands fa-angular text-red-600';
        if (['bootstrap'].includes(l)) return 'fa-brands fa-bootstrap text-purple-600';

        // Compiled / Backend
        if (['java', 'jvm'].includes(l)) return 'fa-brands fa-java text-red-500';
        if (['c', 'cpp', 'c++', 'h', 'hpp'].includes(l)) return 'fa-solid fa-microchip text-blue-600';
        if (['cs', 'csharp', 'c#'].includes(l)) return 'fa-brands fa-microsoft text-purple-500';
        if (['go', 'golang'].includes(l)) return 'fa-brands fa-golang text-cyan-600';
        if (['rust', 'rs'].includes(l)) return 'fa-brands fa-rust text-orange-600';
        if (['swift'].includes(l)) return 'fa-brands fa-swift text-orange-500';
        if (['r'].includes(l)) return 'fa-brands fa-r-project text-blue-400';

        // Mobile / System
        if (['android', 'kotlin', 'kt'].includes(l)) return 'fa-brands fa-android text-green-500';
        if (['apple', 'ios', 'macos', 'objectivec', 'mm'].includes(l)) return 'fa-brands fa-apple text-gray-300';
        if (['linux', 'ubuntu', 'debian', 'arch'].includes(l)) return 'fa-brands fa-linux text-yellow-200';
        if (['windows', 'powershell', 'ps1', 'batch', 'cmd'].includes(l)) return 'fa-brands fa-windows text-blue-400';
        if (['docker', 'dockerfile'].includes(l)) return 'fa-brands fa-docker text-blue-500';
        
        // Data / Config
        if (['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'].includes(l)) return 'fa-solid fa-database text-blue-300';
        if (['json', 'json5'].includes(l)) return 'fa-solid fa-brackets-curly text-yellow-500'; // Valid FA? Use file-code if not
        if (['yaml', 'yml', 'toml', 'ini', 'config'].includes(l)) return 'fa-solid fa-file-code text-purple-400';
        if (['md', 'markdown'].includes(l)) return 'fa-brands fa-markdown text-[var(--theme-text-primary)]';
        if (['csv', 'txt', 'text', 'log'].includes(l)) return 'fa-solid fa-file-lines text-gray-400';
        
        // Tools / Devops
        if (['git', 'diff'].includes(l)) return 'fa-brands fa-git-alt text-orange-500';
        if (['aws'].includes(l)) return 'fa-brands fa-aws text-orange-400';
        if (['jenkins'].includes(l)) return 'fa-brands fa-jenkins text-gray-300';
        if (['npm', 'yarn', 'pnpm'].includes(l)) return 'fa-brands fa-npm text-red-500';
        if (['sh', 'bash', 'zsh', 'shell', 'terminal'].includes(l)) return 'fa-solid fa-terminal text-green-400';
        
        // Visual
        if (['mermaid', 'graphviz', 'dot'].includes(l)) return 'fa-solid fa-project-diagram text-pink-400';
        
        // Fallback
        return 'fa-solid fa-code text-gray-400';
    };

    return (
        <div className="flex items-center gap-2 select-none">
            <i className={`${getIcon(lang)} text-lg w-5 text-center`} aria-hidden="true" />
            <span className="text-[10px] font-bold text-[var(--theme-text-secondary)] uppercase tracking-wider font-sans opacity-90">
                {lang}
            </span>
        </div>
    );
};
