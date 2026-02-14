import { applyMarkToSelection } from './bold.js'

export function anchorPlugin() {
  return {
    name: 'anchor',
    commands: {
      anchor: (engine) => {
        const name = prompt('Anchor name:')
        if (!name) return
        const sel = engine._selection?.captureSelection() || engine._selection?.getSavedSelection()
        if (!sel) return
        if (!sel.isCollapsed) {
          applyMarkToSelection(engine, 'anchor', { name })
        } else {
          // Insert a zero-width space with anchor mark
          engine._handleInsertText('\u200B')
        }
      },
    },
    toolbarButtons: {
      anchor: {
        label: 'Anchor',
        tooltip: 'Insert Anchor',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M17 15l1.55 1.55c-.96 1.69-3.33 3.04-5.55 3.37V11h3V9h-3V7.82C14.16 7.4 15 6.3 15 5c0-1.65-1.35-3-3-3S9 3.35 9 5c0 1.3.84 2.4 2 2.82V9H8v2h3v8.92c-2.22-.33-4.59-1.68-5.55-3.37L7 15l-4 3 4 3 1.62-1.63C10.27 21.29 13.1 22 15 22c1.9 0 4.73-.71 6.38-2.63L23 21l-4-3-4 3 2-3z" fill="currentColor"/></svg>',
        command: 'anchor',
      },
    },
    menuItems: { insert: [{ label: 'Anchor...', command: 'anchor' }] },
  }
}
