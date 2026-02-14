/**
 * Clipboard plugin — cut, copy, paste, select all commands with keyboard shortcuts.
 */

export function clipboardPlugin() {
  return {
    name: 'clipboard',

    commands: [
      {
        name: 'cut',
        execute: (engine) => {
          // Use browser's native cut command which will trigger the paste handler
          const container = engine.getContainer()
          if (container) {
            container.focus()
            // The beforeinput handler will catch 'deleteByCut' and call _handleCut
            // For now, use execCommand which works with contentEditable
            document.execCommand('cut')
          }
        },
      },
      {
        name: 'copy',
        execute: (engine) => {
          const sel = engine._selection?.captureSelection()
          if (!sel || sel.isCollapsed) {
            // Use browser's native copy if no selection
            if (engine.getContainer()) {
              engine.getContainer().focus()
              document.execCommand('copy')
            }
            return
          }

          // Copy selected text to clipboard
          const selectedText = window.getSelection()?.toString() || ''
          if (navigator.clipboard) {
            navigator.clipboard.writeText(selectedText).catch(() => {
              // Fallback for older browsers
              document.execCommand('copy')
            })
          } else {
            document.execCommand('copy')
          }
        },
      },
      {
        name: 'paste',
        execute: async (engine) => {
          // This command is registered but not used for Ctrl+V
          // The native paste event will fire and be handled by _onPaste
          // This command exists for programmatic paste calls
          const container = engine.getContainer()
          if (!container) return
          
          container.focus()
          engine._selection?.captureSelection()
          
          // Try Clipboard API for programmatic paste
          if (navigator.clipboard && navigator.clipboard.readText) {
            try {
              const text = await navigator.clipboard.readText()
              if (text) {
                engine._handleInsertText(text)
              }
            } catch (err) {
              console.warn('Clipboard API read failed:', err)
            }
          }
        },
      },
      {
        name: 'selectAll',
        execute: (engine) => {
          const container = engine.getContainer()
          if (!container) return

          // Select all content in the editor
          const range = document.createRange()
          range.selectNodeContents(container)
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)

          // Update engine's selection state
          engine._selection?.captureSelection()
        },
      },
    ],

    shortcuts: [
      { combo: 'ctrl+x', command: 'cut' },
      { combo: 'ctrl+c', command: 'copy' },
      { combo: 'ctrl+v', command: 'paste' },
      { combo: 'ctrl+a', command: 'selectAll' },
    ],
  }
}
