import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowContext } from '../../contexts/WindowContext';
import { useClickOutside } from '../useClickOutside';

interface UsePortaledMenuOptions {
    menuWidth?: number;
    gap?: number;
    buttonMargin?: number;
    constrainHeight?: boolean;
    minHeight?: number;
}

export const usePortaledMenu = ({
    menuWidth = 240,
    gap = 8,
    buttonMargin = 10,
    constrainHeight = false,
    minHeight = 150,
}: UsePortaledMenuOptions = {}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const { window: targetWindow } = useWindowContext();

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);

    useEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const stopPropagation = (event: Event) => event.stopPropagation();
        const menuElement = menuRef.current;

        menuElement.addEventListener('mousedown', stopPropagation);
        menuElement.addEventListener('touchstart', stopPropagation);

        return () => {
            menuElement.removeEventListener('mousedown', stopPropagation);
            menuElement.removeEventListener('touchstart', stopPropagation);
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen || !buttonRef.current || !targetWindow) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = targetWindow.innerWidth;
        const viewportHeight = targetWindow.innerHeight;
        const nextPosition: CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
        };

        if (buttonRect.left + menuWidth > viewportWidth - buttonMargin) {
            nextPosition.left = buttonRect.right - menuWidth;
            nextPosition.transformOrigin = 'bottom right';
        } else {
            nextPosition.left = buttonRect.left;
            nextPosition.transformOrigin = 'bottom left';
        }

        nextPosition.bottom = viewportHeight - buttonRect.top + gap;

        if (constrainHeight) {
            const availableHeight = buttonRect.top - buttonMargin;
            nextPosition.maxHeight = `${Math.max(minHeight, availableHeight)}px`;
            nextPosition.overflowY = 'auto';
        }

        setMenuPosition(nextPosition);
    }, [buttonMargin, constrainHeight, gap, isOpen, menuWidth, minHeight, targetWindow]);

    return {
        isOpen,
        menuPosition,
        containerRef,
        buttonRef,
        menuRef,
        targetWindow,
        closeMenu: () => setIsOpen(false),
        toggleMenu: () => setIsOpen(prev => !prev),
    };
};
