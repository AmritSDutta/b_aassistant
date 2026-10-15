export interface ProtectionOptions {
  disableContextMenu?: boolean;
  disableDevToolsShortcuts?: boolean;
  onBlocked?: (action: 'contextmenu' | 'devtools' | 'viewsource' | 'save') => void;
}

/**
 * Attaches client-side protection against right-click context menu,
 * F12, developer tools inspection shortcuts, and view-source commands.
 * Returns an unsubscribe cleanup function.
 */
export function initSourceProtection(options: ProtectionOptions = {}): () => void {
  const {
    disableContextMenu = true,
    disableDevToolsShortcuts = true,
    onBlocked,
  } = options;

  const handleContextMenu = (e: MouseEvent): void => {
    if (disableContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      if (onBlocked) onBlocked('contextmenu');
    }
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!disableDevToolsShortcuts) return;

    const key = e.key ? e.key.toLowerCase() : '';
    const keyCode = e.keyCode || e.which;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // F12 developer tools toggle
    if (key === 'f12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      if (onBlocked) onBlocked('devtools');
      return;
    }

    // Ctrl + Shift + I / Cmd + Option + I (Inspect)
    // Ctrl + Shift + J / Cmd + Option + J (Console)
    // Ctrl + Shift + C / Cmd + Option + C (Element selector)
    if (isCtrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      if (onBlocked) onBlocked('devtools');
      return;
    }

    // Ctrl + U / Cmd + Option + U (View Source)
    if (isCtrlOrMeta && key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      if (onBlocked) onBlocked('viewsource');
      return;
    }

    // Ctrl + S / Cmd + S (Save page)
    if (isCtrlOrMeta && key === 's') {
      e.preventDefault();
      e.stopPropagation();
      if (onBlocked) onBlocked('save');
      return;
    }
  };

  window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return (): void => {
    window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}
