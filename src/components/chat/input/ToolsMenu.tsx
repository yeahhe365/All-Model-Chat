import React from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, Globe, Check, Terminal, Link, X, Telescope, Calculator, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../../contexts/I18nContext';
import { IconYoutube, IconPython } from '../../icons/CustomIcons';
import { CHAT_INPUT_BUTTON_CLASS } from '../../../constants/appConstants';
import { usePortaledMenu } from '../../../hooks/ui/usePortaledMenu';
import { getModelCapabilities } from '../../../utils/modelHelpers';

interface ToolsMenuProps {
  currentModelId: string;
  isGoogleSearchEnabled: boolean;
  onToggleGoogleSearch: () => void;
  isCodeExecutionEnabled: boolean;
  onToggleCodeExecution: () => void;
  isLocalPythonEnabled?: boolean;
  onToggleLocalPython?: () => void;
  isUrlContextEnabled: boolean;
  onToggleUrlContext: () => void;
  isDeepSearchEnabled: boolean;
  onToggleDeepSearch: () => void;
  onAddYouTubeVideo: () => void;
  onCountTokens: () => void;
  disabled: boolean;
  isNativeAudioModel?: boolean;
}

const ActiveToolBadge: React.FC<{
  label: string;
  onRemove: () => void;
  removeAriaLabel: string;
  icon: React.ReactNode;
}> = ({ label, onRemove, removeAriaLabel, icon }) => (
  <>
    <div className="h-4 w-px bg-[var(--theme-border-secondary)] mx-1.5"></div>
    <div
      className="group flex items-center gap-1.5 bg-blue-500/10 text-[var(--theme-text-link)] text-sm px-2.5 py-1 rounded-full transition-all select-none hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] cursor-pointer"
      style={{ animation: `fadeInUp 0.3s ease-out both` }}
      onClick={onRemove}
      role="button"
      aria-label={removeAriaLabel}
    >
      <div className="relative flex items-center justify-center w-3.5 h-3.5">
        <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-75 rotate-0 group-hover:-rotate-90">
          {icon}
        </span>
        <span className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 rotate-90 group-hover:rotate-0 text-[var(--theme-icon-error)]">
          <X size={14} strokeWidth={2.5} />
        </span>
      </div>
      <span className="font-medium">{label}</span>
    </div>
  </>
);

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  currentModelId,
  isGoogleSearchEnabled,
  onToggleGoogleSearch,
  isCodeExecutionEnabled,
  onToggleCodeExecution,
  isLocalPythonEnabled,
  onToggleLocalPython,
  isUrlContextEnabled,
  onToggleUrlContext,
  isDeepSearchEnabled,
  onToggleDeepSearch,
  onAddYouTubeVideo,
  onCountTokens,
  disabled,
  isNativeAudioModel,
}) => {
  const { t } = useI18n();
  const { isOpen, menuPosition, containerRef, buttonRef, menuRef, targetWindow, closeMenu, toggleMenu } =
    usePortaledMenu();
  const capabilities = getModelCapabilities(currentModelId);
  const isImageModel = capabilities.isImagenModel;
  const isGemini3ImageModel = capabilities.isGemini3ImageModel;
  const supportsBuiltInCustomToolCombination = capabilities.isGemini3;
  const isGemmaModel = capabilities.isGemmaModel;

  const handleToggle = (toggleFunc?: () => void) => {
    if (toggleFunc) {
      toggleFunc();
      closeMenu();
    }
  };

  // Matched icon size to other toolbar buttons (Attachment, Mic, etc.)
  const menuIconSize = 20;

  const menuItems = [
    {
      labelKey: 'deep_search_label',
      icon: <Telescope size={18} strokeWidth={2} />,
      isEnabled: isDeepSearchEnabled,
      action: () => handleToggle(onToggleDeepSearch),
    },
    {
      labelKey: 'web_search_label',
      icon: <Globe size={18} strokeWidth={2} />,
      isEnabled: isGoogleSearchEnabled,
      action: () => handleToggle(onToggleGoogleSearch),
    },
    {
      labelKey: 'code_execution_label',
      icon: <Terminal size={18} strokeWidth={2} />,
      isEnabled: isCodeExecutionEnabled,
      action: () => handleToggle(onToggleCodeExecution),
    },
    {
      labelKey: 'local_python_label',
      icon: <IconPython size={18} strokeWidth={2} />,
      isEnabled: !!isLocalPythonEnabled,
      action: () => handleToggle(onToggleLocalPython),
    },
    {
      labelKey: 'url_context_label',
      icon: <Link size={18} strokeWidth={2} />,
      isEnabled: isUrlContextEnabled,
      action: () => handleToggle(onToggleUrlContext),
    },
    {
      labelKey: 'attachMenu_addByUrl',
      icon: <IconYoutube size={18} strokeWidth={2} />,
      isEnabled: false,
      action: () => {
        onAddYouTubeVideo();
        closeMenu();
      },
    },
    {
      labelKey: 'tools_token_count_label',
      icon: <Calculator size={18} strokeWidth={2} />,
      isEnabled: false,
      action: () => {
        onCountTokens();
        closeMenu();
      },
    },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (isNativeAudioModel) {
      if (item.labelKey === 'local_python_label') {
        return !!onToggleLocalPython;
      }

      // In Live mode, web search has a dedicated toggle and the remaining
      // server-side tools in this menu are intentionally hidden for now.
      return false;
    }

    if (isImageModel) {
      if (item.labelKey === 'tools_token_count_label') {
        return true;
      }

      return isGemini3ImageModel && item.labelKey === 'web_search_label';
    }

    if (isGemmaModel) {
      if (item.labelKey === 'code_execution_label' || item.labelKey === 'url_context_label') {
        return false;
      }
    }

    // Only show Local Python if handler is provided (it's new feature)
    if (item.labelKey === 'local_python_label' && !onToggleLocalPython) {
      return false;
    }
    return true;
  });

  const hasBuiltInToolEnabled =
    isGoogleSearchEnabled || isDeepSearchEnabled || isCodeExecutionEnabled || isUrlContextEnabled;
  const showBuiltInCustomToolNotice =
    !supportsBuiltInCustomToolCombination &&
    !isNativeAudioModel &&
    !isImageModel &&
    !!isLocalPythonEnabled &&
    hasBuiltInToolEnabled;

  if (filteredItems.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center">
        <div className="relative" ref={containerRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleMenu}
            disabled={disabled}
            className={`${CHAT_INPUT_BUTTON_CLASS} text-[var(--theme-icon-attach)] ${isOpen ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]' : 'bg-transparent hover:bg-[var(--theme-bg-tertiary)]'}`}
            aria-label={t('tools_button')}
            title={t('tools_button')}
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            <SlidersHorizontal size={menuIconSize} strokeWidth={2} />
          </button>
          {isOpen &&
            targetWindow &&
            createPortal(
              <div
                ref={menuRef}
                className="fixed w-60 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium py-1.5 custom-scrollbar"
                style={menuPosition}
                role="menu"
              >
                {filteredItems.map((item) => (
                  <button
                    key={item.labelKey}
                    onClick={item.action}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--theme-bg-tertiary)] flex items-center justify-between transition-colors ${item.isEnabled ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-primary)]'}`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={
                          item.isEnabled ? 'text-[var(--theme-text-link)]' : 'text-[var(--theme-text-secondary)]'
                        }
                      >
                        {item.icon}
                      </span>
                      <span className="font-medium">{t(item.labelKey)}</span>
                    </div>
                    {item.isEnabled && <Check size={16} className="text-[var(--theme-text-link)]" strokeWidth={2} />}
                  </button>
                ))}
              </div>,
              targetWindow.document.body,
            )}
        </div>
        {/* Only show badges for tools that are relevant to the current mode */}
        {!isNativeAudioModel && !isImageModel && isDeepSearchEnabled && (
          <ActiveToolBadge
            label={t('deep_search_short')}
            onRemove={onToggleDeepSearch}
            removeAriaLabel="Disable Deep Search"
            icon={<Telescope size={14} strokeWidth={2} />}
          />
        )}

        {/* In Live Mode, Web Search is a toggle button, so badge is redundant/confusing if inside tools menu logic, but let's hide it from here if the button shows status */}
        {!isNativeAudioModel && isGoogleSearchEnabled && (!isImageModel || isGemini3ImageModel) && (
          <ActiveToolBadge
            label={t('web_search_short')}
            onRemove={onToggleGoogleSearch}
            removeAriaLabel="Disable Web Search"
            icon={<Globe size={14} strokeWidth={2} />}
          />
        )}

        {!isNativeAudioModel && !isImageModel && !isGemmaModel && isCodeExecutionEnabled && (
          <ActiveToolBadge
            label={t('code_execution_short')}
            onRemove={onToggleCodeExecution}
            removeAriaLabel="Disable Code Execution"
            icon={<Terminal size={14} strokeWidth={2} />}
          />
        )}

        {!isImageModel && isLocalPythonEnabled && onToggleLocalPython && (
          <ActiveToolBadge
            label={t('local_python_short')}
            onRemove={onToggleLocalPython}
            removeAriaLabel="Disable Local Python"
            icon={<IconPython size={14} strokeWidth={2} />}
          />
        )}

        {!isNativeAudioModel && !isImageModel && !isGemmaModel && isUrlContextEnabled && (
          <ActiveToolBadge
            label={t('url_context_short')}
            onRemove={onToggleUrlContext}
            removeAriaLabel="Disable URL Context"
            icon={<Link size={14} strokeWidth={2} />}
          />
        )}
      </div>
      {showBuiltInCustomToolNotice && (
        <div className="max-w-sm rounded-xl border border-[var(--theme-bg-danger)]/20 bg-[var(--theme-bg-danger)]/8 px-3 py-2 text-xs text-[var(--theme-text-secondary)]">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--theme-text-danger)]" strokeWidth={2} />
            <span>{t('tools_local_python_combination_notice')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
