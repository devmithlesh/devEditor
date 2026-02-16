/**
 * Link plugin — insert/edit links.
 */

import { toggleMark, isMarkActive, applyMarkToSelection, removeMarkFromSelection } from './bold.js'
import { findNodeById } from '../../utils/helpers.js'

export function linkPlugin() {
  return {
    name: 'link',

    commands: [
      {
        name: 'link',
        execute: (engine) => {
          // This command is now mainly used from the popup.
          // If called directly (e.g., from menu), fall back to prompt.
          const sel = engine._selection?.captureSelection()
          if (!sel) return

          const node = findNodeById(engine._model.doc, sel.anchorNodeId)
          const existingLink = node?.marks?.find((m) => m.type === 'link')

          const url = prompt('Enter URL:', existingLink?.attrs?.href || 'https://')
          if (url === null) return

          if (url === '') {
            removeMarkFromSelection(engine, 'link')
            return
          }

          if (sel.isCollapsed) {
            const linkText = prompt('Enter link text:', url) || url
            engine._handleInsertText(linkText)
            const newSel = engine._selection.getSavedSelection()
            if (newSel) {
              engine._selection.setSavedSelection({
                ...newSel,
                anchorOffset: newSel.anchorOffset - linkText.length,
                isCollapsed: false,
              })
            }
          }

          applyMarkToSelection(engine, 'link', { href: url, target: '_blank' })
        },
      },
      {
        name: 'unlink',
        execute: (engine) => {
          removeMarkFromSelection(engine, 'link')
        },
      },
      {
        name: 'insertLink',
        execute: (engine, url, text) => {
          if (!url) return
          const sel = engine._selection?.getSavedSelection()
          if (!sel) return

          if (sel.isCollapsed && text) {
            engine._handleInsertText(text)
            const newSel = engine._selection.getSavedSelection()
            if (newSel) {
              engine._selection.setSavedSelection({
                ...newSel,
                anchorOffset: newSel.anchorOffset - text.length,
                isCollapsed: false,
              })
            }
          }

          applyMarkToSelection(engine, 'link', { href: url, target: '_blank' })
        },
      },
    ],

    toolbarButtons: [
      {
        name: 'link',
        tooltip: 'Insert/edit link',
        icon: '<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="currentColor"/></svg>',
        command: 'link',
        type: 'popup',
        popupType: 'link',
        shortcutLabel: 'Ctrl+K',
        isActive: (engine) => isMarkActive(engine, 'link'),
      },
    ],

    shortcuts: [
      { combo: 'ctrl+k', command: 'link' },
    ],
  }
}
