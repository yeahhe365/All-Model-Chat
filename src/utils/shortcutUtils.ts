
import { AppSettings } from '../types';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';

export const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const formatShortcut = (shortcut: string): string[] => {
    if (!shortcut) return [];
    
    const parts = shortcut.split('+');
    return parts.map(part => {
        const lower = part.trim().toLowerCase();
        if (lower === 'mod') return isMac ? '⌘' : 'Ctrl';
        if (lower === 'alt') return isMac ? 'Opt' : 'Alt';
        if (lower === 'shift') return 'Shift';
        if (lower === 'ctrl') return 'Ctrl';
        if (lower === 'meta') return isMac ? 'Cmd' : 'Win';
        if (lower === 'enter') return 'Enter';
        if (lower === 'escape') return 'Esc';
        if (lower === 'delete') return 'Del';
        if (lower === 'backspace') return 'Back';
        if (lower === 'tab') return 'Tab';
        if (lower === 'arrowup') return '↑';
        if (lower === 'arrowdown') return '↓';
        if (lower === 'arrowleft') return '←';
        if (lower === 'arrowright') return '→';
        if (lower === ' ') return 'Space';
        return part.toUpperCase();
    });
};

export const normalizeKey = (key: string): string => {
    const lower = key.toLowerCase();
    if (lower === 'control') return 'ctrl';
    if (lower === 'escape') return 'escape';
    if (lower === 'enter') return 'enter';
    if (lower === 'tab') return 'tab';
    if (lower === ' ') return 'space';
    if (lower === 'arrowup') return 'arrowup';
    if (lower === 'arrowdown') return 'arrowdown';
    if (lower === 'arrowleft') return 'arrowleft';
    if (lower === 'arrowright') return 'arrowright';
    return lower;
};

export const getEventKeyCombo = (e: React.KeyboardEvent | KeyboardEvent): string | null => {
    // Ignore modifier-only presses for combo detection (unless that's what we want? usually not)
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;

    const parts: string[] = [];
    
    if (e.ctrlKey) parts.push('ctrl');
    if (e.metaKey) parts.push('meta');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    // Handle normal keys
    let key = e.key;
    if (key === ' ') key = 'space';
    if (key === 'ArrowUp') key = 'arrowup';
    if (key === 'ArrowDown') key = 'arrowdown';
    if (key === 'ArrowLeft') key = 'arrowleft';
    if (key === 'ArrowRight') key = 'arrowright';
    if (key === 'Enter') key = 'enter';
    if (key === 'Escape') key = 'escape';
    if (key === 'Tab') key = 'tab';
    if (key === 'Delete') key = 'delete';
    if (key === 'Backspace') key = 'backspace';

    if (key.length === 1) key = key.toLowerCase();
    else key = key.toLowerCase();

    parts.push(key);

    // Filter duplicates if any
    const uniqueParts = [...new Set(parts)];

    // Sort modifiers: meta, ctrl, alt, shift
    const order = ['meta', 'ctrl', 'alt', 'shift'];
    const modifiers = uniqueParts.slice(0, -1).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const finalKey = uniqueParts[uniqueParts.length - 1];

    let resultParts = [...modifiers, finalKey];
    
    // Normalize to 'mod' concept for cross-platform defaults
    if (isMac) {
        if (resultParts.includes('meta')) {
            resultParts = resultParts.map(p => p === 'meta' ? 'mod' : p);
        }
    } else {
        if (resultParts.includes('ctrl')) {
            resultParts = resultParts.map(p => p === 'ctrl' ? 'mod' : p);
        }
    }

    return resultParts.join('+');
};

export const recordKeyCombination = (e: React.KeyboardEvent | KeyboardEvent): string | null => {
    e.preventDefault();
    e.stopPropagation();
    return getEventKeyCombo(e);
};

export const isShortcutPressed = (e: React.KeyboardEvent | KeyboardEvent, actionId: string, settings: AppSettings): boolean => {
    const customKey = settings.customShortcuts?.[actionId];
    const defaultKey = DEFAULT_SHORTCUTS[actionId];
    const targetKey = customKey !== undefined ? customKey : defaultKey;

    if (!targetKey) return false;

    const pressedKey = getEventKeyCombo(e);
    return pressedKey === targetKey;
};

export const getShortcutDisplay = (actionId: string, settings: AppSettings): string => {
    const customKey = settings.customShortcuts?.[actionId];
    const key = customKey !== undefined ? customKey : DEFAULT_SHORTCUTS[actionId];
    if (!key) return '';
    return formatShortcut(key).join(' + ');
};
