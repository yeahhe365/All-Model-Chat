import React, { useEffect, useState } from 'react';
import { translations } from '../../utils/appUtils';
import { Command } from 'lucide-react';

interface ShortcutsSectionProps {
    t: (key: keyof typeof translations | string) => string;
}

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({ t }) => {
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }, []);

    const Kbd = ({ children }: { children: React.ReactNode }) => (
        <kbd className="px-2 py-1 text-xs font-semibold text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-secondary)] rounded-md font-mono shadow-sm min-w-[24px] inline-flex justify-center items-center">
            {children}
        </kbd>
    );

    const ShortcutRow = ({ label, keys }: { label: string, keys: React.ReactNode[] }) => (
        <div className="flex items-center justify-between py-3 border-b border-[var(--theme-border-secondary)]/50 last:border-0">
            <span className="text-sm text-[var(--theme-text-secondary)] font-medium">{label}</span>
            <div className="flex items-center gap-1.5">
                {keys.map((k, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="text-[var(--theme-text-tertiary)] text-xs">+</span>}
                        {k}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    const modKey = isMac ? <Kbd><Command size={10} /></Kbd> : <Kbd>Ctrl</Kbd>;
    const altKey = <Kbd>{isMac ? 'Opt' : 'Alt'}</Kbd>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-3">
                    {t('shortcuts_general_title')}
                </h4>
                <ShortcutRow label={t('shortcuts_new_chat')} keys={[modKey, altKey, <Kbd>N</Kbd>]} />
                <ShortcutRow label={t('shortcuts_open_logs')} keys={[modKey, altKey, <Kbd>L</Kbd>]} />
                <ShortcutRow label={t('shortcuts_toggle_pip')} keys={[modKey, altKey, <Kbd>P</Kbd>]} />
            </div>

            <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)] mb-3">
                    {t('shortcuts_chat_input_title')}
                </h4>
                <ShortcutRow label={t('shortcuts_send_message')} keys={[<Kbd>Enter</Kbd>]} />
                <ShortcutRow label={t('shortcuts_new_line')} keys={[<Kbd>Shift</Kbd>, <Kbd>Enter</Kbd>]} />
                <ShortcutRow label={t('shortcuts_cycle_models')} keys={[<Kbd>Tab</Kbd>]} />
                <ShortcutRow label={t('shortcuts_clear_chat')} keys={[<Kbd>Del</Kbd>]} />
                <ShortcutRow label={t('shortcuts_slash_commands')} keys={[<Kbd>/</Kbd>]} />
            </div>
        </div>
    );
};