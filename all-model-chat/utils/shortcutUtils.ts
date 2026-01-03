
import { KeyDefinition } from '../types/settings';

/**
 * Checks if a keyboard event matches a given shortcut configuration.
 * Handles "mod" (Command/Control) logic based on platform.
 */
export const checkShortcut = (event: KeyboardEvent, shortcut: KeyDefinition | undefined): boolean => {
    if (!shortcut) return false;
    
    // Normalize keys
    const targetKey = shortcut.key.toLowerCase();
    const pressedKey = event.key.toLowerCase();
    
    if (targetKey !== pressedKey) return false;

    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // Resolve 'mod' to specific keys
    // If shortcut.mod is true:
    //   - On Mac: Require metaKey (Cmd) to be true
    //   - On Other: Require ctrlKey to be true
    // If shortcut.mod is false/undefined, strict check specific ctrl/meta properties
    
    const requiredCtrl = shortcut.ctrl || (shortcut.mod && !isMac);
    const requiredMeta = shortcut.meta || (shortcut.mod && isMac);
    
    return (
        event.ctrlKey === !!requiredCtrl &&
        event.metaKey === !!requiredMeta &&
        event.altKey === !!shortcut.alt &&
        event.shiftKey === !!shortcut.shift
    );
};

export const formatShortcut = (shortcut: KeyDefinition): string => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const parts = [];

    if (shortcut.mod) {
        parts.push(isMac ? 'Cmd' : 'Ctrl');
    }
    if (shortcut.ctrl && !shortcut.mod) parts.push('Ctrl');
    if (shortcut.meta && !shortcut.mod) parts.push(isMac ? 'Cmd' : 'Win');
    if (shortcut.alt) parts.push(isMac ? 'Opt' : 'Alt');
    if (shortcut.shift) parts.push('Shift');
    
    let keyDisplay = shortcut.key.toUpperCase();
    if (keyDisplay === ' ') keyDisplay = 'Space';
    parts.push(keyDisplay);

    return parts.join(isMac ? ' ' : ' + ');
};
