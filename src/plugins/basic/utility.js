/**
 * Utility plugin — provides common utility commands like newDocument, showShortcuts, showAbout.
 */

export function utilityPlugin() {
  return {
    name: 'utility',

    commands: {
      newDocument: (engine) => {
        if (confirm('Create a new document? All unsaved changes will be lost.')) {
          engine.setContent('')
          engine._historyManager?.clear()
        }
      },
      showShortcuts: (engine) => {
        const shortcuts = [
          'Ctrl+Z - Undo',
          'Ctrl+Y - Redo',
          'Ctrl+X - Cut',
          'Ctrl+C - Copy',
          'Ctrl+V - Paste',
          'Ctrl+A - Select All',
          'Ctrl+B - Bold',
          'Ctrl+I - Italic',
          'Ctrl+U - Underline',
          'Ctrl+K - Insert Link',
          'Ctrl+P - Print',
          'F11 - Fullscreen',
        ]
        alert('Keyboard Shortcuts:\n\n' + shortcuts.join('\n'))
      },
      showAbout: (engine) => {
        alert('DevEditor\n\nA modern rich text editor built with React.\n\nVersion 1.0.0')
      },
    },

    // Menu items are already in MenuParser defaults, no need to duplicate
  }
}
