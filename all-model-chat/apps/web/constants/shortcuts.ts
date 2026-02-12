
import { translations } from '../utils/appUtils';

export interface ShortcutDefinition {
    id: string;
    labelKey: keyof typeof translations | string;
    defaultKey: string;
    category: 'general' | 'input' | 'global';
}

export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
    // General
    { id: 'general.newChat', labelKey: 'shortcuts_new_chat', defaultKey: 'mod+shift+n', category: 'general' },
    { id: 'general.openLogs', labelKey: 'shortcuts_open_logs', defaultKey: 'mod+alt+l', category: 'general' },
    { id: 'general.togglePip', labelKey: 'shortcuts_toggle_pip', defaultKey: 'mod+shift+p', category: 'general' },
    { id: 'general.toggleFullscreen', labelKey: 'shortcuts_toggle_fullscreen', defaultKey: 'mod+shift+f', category: 'general' },
    
    // Chat Input
    { id: 'input.sendMessage', labelKey: 'shortcuts_send_message', defaultKey: 'enter', category: 'input' },
    { id: 'input.newLine', labelKey: 'shortcuts_new_line', defaultKey: 'shift+enter', category: 'input' },
    { id: 'input.editLast', labelKey: 'shortcuts_edit_last', defaultKey: 'arrowup', category: 'input' },
    { id: 'input.cycleModels', labelKey: 'shortcuts_cycle_models', defaultKey: 'tab', category: 'input' },
    { id: 'input.slashCommands', labelKey: 'shortcuts_slash_commands', defaultKey: '/', category: 'input' },
    { id: 'input.clearDraft', labelKey: 'shortcuts_clear_input_draft', defaultKey: 'delete', category: 'input' },

    // Global / Dialogs
    { id: 'global.stopCancel', labelKey: 'shortcuts_stop_cancel', defaultKey: 'escape', category: 'global' },
    { id: 'global.saveConfirm', labelKey: 'shortcuts_save_confirm', defaultKey: 'mod+enter', category: 'global' },
    { id: 'global.prevFile', labelKey: 'shortcuts_file_nav', defaultKey: 'arrowleft', category: 'global' },
    { id: 'global.nextFile', labelKey: 'shortcuts_file_nav', defaultKey: 'arrowright', category: 'global' },
];

export const DEFAULT_SHORTCUTS: Record<string, string> = SHORTCUT_REGISTRY.reduce((acc, item) => {
    acc[item.id] = item.defaultKey;
    return acc;
}, {} as Record<string, string>);