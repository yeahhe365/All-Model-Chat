
import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Loader2, ArrowUp } from 'lucide-react';
import { IconStop } from '../../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../../constants/appConstants';

interface SendControlsProps {
    isLoading: boolean;
    isEditing: boolean;
    canSend: boolean;
    isWaitingForUpload: boolean;
    editMode?: 'update' | 'resend';
    onStopGenerating: () => void;
    onCancelEdit: () => void;
    onFastSendMessage?: () => void;
    t: (key: string, fallback?: string) => string;
}

interface Ripple {
    x: number;
    y: number;
    id: number;
    size: number;
}

export const SendControls: React.FC<SendControlsProps> = ({
    isLoading,
    isEditing,
    canSend,
    isWaitingForUpload,
    editMode,
    onStopGenerating,
    onCancelEdit,
    onFastSendMessage,
    t
}) => {
    const iconSize = 20;
    const [ripples, setRipples] = useState<Ripple[]>([]);

    useEffect(() => {
        if (ripples.length > 0) {
            const timeout = setTimeout(() => setRipples([]), 600);
            return () => clearTimeout(timeout);
        }
    }, [ripples]);

    const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        setRipples(prev => [...prev, { x, y, id: Date.now(), size }]);
    };

    // Determine state priorities
    const isStop = isLoading;
    const isUpload = !isLoading && isWaitingForUpload;
    const isEdit = !isLoading && isEditing;
    const isSend = !isLoading && !isEditing && !isWaitingForUpload;

    // Determine disabled state
    // Note: Stop button is never disabled by canSend.
    const isDisabled = !isLoading && (!canSend || isWaitingForUpload);
    
    // Determine background class
    let bgClass = "bg-[var(--theme-bg-accent)] hover:bg-[var(--theme-bg-accent-hover)] text-[var(--theme-text-accent)]";
    
    if (isDisabled && !isUpload) {
        bgClass = "bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] cursor-not-allowed";
    } else if (isStop) {
        bgClass = "bg-[var(--theme-bg-danger)] hover:bg-[var(--theme-bg-danger-hover)] text-[var(--theme-icon-stop)]";
    } else if (isEdit) {
        bgClass = "bg-amber-500 hover:bg-amber-600 text-white";
    } else if (isUpload) {
        // Active processing state uses accent color with progress stripes
        bgClass = "bg-[var(--theme-bg-accent)] text-[var(--theme-text-accent)] cursor-wait bg-progress-stripe";
    }

    // Determine shape class for morphing
    // Stop button is squarer (rounded-xl) to match stop icon metaphor
    // Others are circular (rounded-full)
    // Using explicit pixel radius or consistent scale ensures smoother transition than mixed units
    const shapeClass = isStop ? '!rounded-[12px]' : '!rounded-full';

    // Handlers
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Create ripple if button is interactive
        if (!isDisabled) {
            createRipple(e);
        }

        if (isStop) {
            e.preventDefault();
            e.stopPropagation();
            onStopGenerating();
        } else if (isDisabled) {
            e.preventDefault();
        }
        // For submit (send/edit), we let the form handler take over unless blocked
    };
    
    const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isSend && onFastSendMessage && !isDisabled) {
            e.preventDefault();
            createRipple(e);
            onFastSendMessage();
        }
    };

    // Text & Tooltips
    let label = t('sendMessage_aria');
    let title = t('sendMessage_title');
    
    if (isStop) {
        label = t('stopGenerating_aria');
        title = t('stopGenerating_title');
    } else if (isEdit) {
        label = t('updateMessage_aria');
        title = t('updateMessage_title');
    } else if (isUpload) {
        label = "Waiting for upload...";
        title = "Waiting for upload to complete before sending";
    } else if (isSend && onFastSendMessage && !isDisabled) {
        title = t('sendMessage_title') + t('sendMessage_fast_suffix', " (Right-click for Fast Mode ⚡)");
    }

    const renderIcon = (active: boolean, Icon: React.ElementType, props: any = {}) => (
        <div 
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${active ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
            aria-hidden={!active}
        >
            <Icon {...props} />
        </div>
    );

    return (
        <div className="flex items-center">
             {/* Cancel Edit Button - Animates in/out */}
             <div className={`transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden flex items-center ${isEditing ? 'max-w-[50px] opacity-100 mr-2' : 'max-w-0 opacity-0 mr-0'}`}>
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancelEdit(); }}
                    className={`${CHAT_INPUT_BUTTON_CLASS} bg-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-icon-settings)]`}
                    aria-label={t('cancelEdit_aria')}
                    title={t('cancelEdit_title')}
                    disabled={!isEditing} 
                    tabIndex={isEditing ? 0 : -1}
                >
                    <X size={iconSize} strokeWidth={2} />
                </button>
            </div>

            {/* Main Action Button */}
            <button
                type={isStop ? "button" : "submit"}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                disabled={!isStop && isDisabled}
                className={`${CHAT_INPUT_BUTTON_CLASS} ${bgClass} ${shapeClass} relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm active:scale-95`}
                aria-label={label}
                title={title}
            >
                {/* Ripples */}
                {ripples.map(ripple => (
                    <span
                        key={ripple.id}
                        className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
                        style={{
                            left: ripple.x,
                            top: ripple.y,
                            width: ripple.size,
                            height: ripple.size,
                        }}
                    />
                ))}

                {/* Icons stack on top of each other and fade/rotate in/out */}
                {renderIcon(isStop, IconStop, { size: 12 })}
                {renderIcon(isUpload, Loader2, { size: iconSize, className: "animate-spin", strokeWidth: 2 })}
                {renderIcon(isEdit, editMode === 'update' ? Save : Edit2, { size: iconSize, strokeWidth: 2 })}
                {renderIcon(isSend, ArrowUp, { size: iconSize, strokeWidth: 2 })}
            </button>
        </div>
    );
};
