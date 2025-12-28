
import React from 'react';
import { ImageIcon, FileCode2, FileText, FileJson } from 'lucide-react';
import { ExportType } from '../../../../hooks/useMessageExport';
import { useResponsiveValue } from '../../../../hooks/useDevice';

interface ExportOptionsProps {
    onExport: (type: ExportType) => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ onExport }) => {
    const buttonIconSize = useResponsiveValue(24, 28);

    const options = [
        { id: 'png' as const, icon: ImageIcon, label: 'PNG Image', desc: 'Visual snapshot', colorClass: 'text-[var(--theme-text-link)]' },
        { id: 'html' as const, icon: FileCode2, label: 'HTML File', desc: 'Web page format', colorClass: 'text-green-500' },
        { id: 'txt' as const, icon: FileText, label: 'TXT File', desc: 'Plain text', colorClass: 'text-blue-500' },
        { id: 'json' as const, icon: FileJson, label: 'JSON File', desc: 'Raw data', colorClass: 'text-orange-500' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => onExport(opt.id)}
                    className={`
                        flex flex-col items-center justify-center gap-3 p-6 
                        bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] 
                        rounded-lg border border-[var(--theme-border-secondary)] 
                        transition-all duration-200 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] 
                        transform hover:-translate-y-1 hover:shadow-lg
                    `}
                >
                    <opt.icon size={buttonIconSize} className={opt.colorClass} strokeWidth={1.5} />
                    <span className="font-semibold text-base text-[var(--theme-text-primary)]">{opt.label}</span>
                    <span className="text-xs text-center text-[var(--theme-text-tertiary)]">{opt.desc}</span>
                </button>
            ))}
        </div>
    );
};
